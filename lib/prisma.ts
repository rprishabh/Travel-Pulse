// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — Prisma Client Singleton
// Zero connection-leak handling via global singleton pattern
// skills.md §1: Deep error boundaries for all background workers
// ─────────────────────────────────────────────────────────────────────────────

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION POOL CONFIGURATION
// Optimized for high-read / low-write replication (skills.md §1)
// ═══════════════════════════════════════════════════════════════════════════════

const PRISMA_CLIENT_OPTIONS: Prisma.PrismaClientOptions = {
  log:
    process.env.NODE_ENV === "development"
      ? [
          { level: "query", emit: "event" },
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ]
      : [
          { level: "error", emit: "stdout" },
          { level: "warn", emit: "stdout" },
        ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL SINGLETON — PREVENTS CONNECTION LEAKS
// In Next.js dev mode, hot-reload creates new PrismaClient instances on every
// file change. This global cache ensures only ONE client is ever instantiated.
// In production, the module-level singleton is sufficient.
// ═══════════════════════════════════════════════════════════════════════════════

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pgPool ?? new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    ...PRISMA_CLIENT_OPTIONS,
    adapter,
  });

  // ── Connection lifecycle hooks ────────────────────────────────────────
  client.$connect().catch((error) => {
    console.error(
      "[PrismaClient] ❌ Failed to establish database connection:",
      error
    );
    // Do NOT throw — let queries fail individually with proper error boundaries
    // rather than crashing the entire process on startup.
  });

  // ── Graceful shutdown handlers ────────────────────────────────────────
  // Prevents connection pool exhaustion on process termination
  const shutdownHandler = async (signal: string) => {
    console.log(
      `[PrismaClient] 🔌 Received ${signal}. Disconnecting Prisma Client...`
    );
    await client.$disconnect();
    await pool.end();
    process.exit(0);
  };

  // Only attach shutdown handlers once (check prevents duplicate listeners
  // during dev hot-reload cycles)
  if (!globalForPrisma.prisma) {
    process.on("SIGINT", () => shutdownHandler("SIGINT"));
    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
    process.on("beforeExit", async () => {
      await client.$disconnect();
      await pool.end();
    });
  }

  return client;
}

/**
 * Singleton PrismaClient instance.
 * Safe for use across all Next.js API routes, server components,
 * and background cron workers without connection pool leaks.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRISMA ERROR CLASSIFICATION HELPERS
// Used by error boundary layers to classify database errors for proper
// HTTP status code mapping and user-facing error messages.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if a thrown error is a Prisma known request error.
 * These are anticipated errors (constraint violations, not-found, etc.)
 * as opposed to infrastructure errors (connection refused, timeout).
 */
export function isPrismaKnownError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

/**
 * Checks if the error is a Prisma connection/initialization error.
 * Indicates infrastructure-level failure requiring alert escalation.
 */
export function isPrismaConnectionError(
  error: unknown
): error is Prisma.PrismaClientInitializationError {
  return error instanceof Prisma.PrismaClientInitializationError;
}

/**
 * Checks if the error is a Prisma validation error (bad input data).
 */
export function isPrismaValidationError(
  error: unknown
): error is Prisma.PrismaClientValidationError {
  return error instanceof Prisma.PrismaClientValidationError;
}

/**
 * Maps Prisma error codes to user-friendly HTTP status codes.
 */
export function prismaErrorToHttpStatus(error: unknown): number {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case "P2000": // Value too long for column type
        return 400;
      case "P2001": // Record not found
        return 404;
      case "P2002": // Unique constraint violation
        return 409;
      case "P2003": // Foreign key constraint failed
        return 409;
      case "P2025": // Record to update/delete not found
        return 404;
      default:
        return 500;
    }
  }
  if (isPrismaValidationError(error)) {
    return 400;
  }
  if (isPrismaConnectionError(error)) {
    return 503;
  }
  return 500;
}

/**
 * Extracts a safe, user-facing error message from Prisma errors.
 * Never leaks internal schema details or query structure.
 */
export function prismaErrorToMessage(error: unknown): string {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case "P2000":
        return "The provided value is too long for this field.";
      case "P2001":
        return "The requested record was not found.";
      case "P2002": {
        const target = (error.meta?.target as string[])?.join(", ") ?? "field";
        return `A record with this ${target} already exists.`;
      }
      case "P2003":
        return "This operation references a record that does not exist.";
      case "P2025":
        return "The record you are trying to update or delete was not found.";
      default:
        return "A database error occurred. Please try again later.";
    }
  }
  if (isPrismaValidationError(error)) {
    return "Invalid data provided. Please check your request and try again.";
  }
  if (isPrismaConnectionError(error)) {
    return "Database service is temporarily unavailable. Please try again later.";
  }
  return "An unexpected error occurred. Please try again later.";
}

export default prisma;
