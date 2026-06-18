// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/advisories/alerts — Live Travel Alerts API
// GET: Active travel alerts with severity filtering and geo-targeting
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiSuccess,
  apiPaginatedSuccess,
  apiError,
  parsePagination,
  parseEnumParam,
  parseBooleanParam,
} from "@/lib/api-response";
import { withErrorBoundary } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/advisories/alerts — Fetch Active Travel Alerts
// Supports: pagination, severity, category, country, resolved status
// Auto-filters expired alerts (expiresAt < now)
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const [data, error] = await withErrorBoundary(async () => {
    const { searchParams } = request.nextUrl;

    // ── Parse query parameters ──────────────────────────────────────────
    const { page, pageSize, skip } = parsePagination(searchParams);
    const severity = parseEnumParam(searchParams.get("severity"), [
      "INFO",
      "WARNING",
      "CRITICAL",
      "EMERGENCY",
    ] as const);
    const alertCategory = parseEnumParam(searchParams.get("category"), [
      "WEATHER",
      "HEALTH",
      "SECURITY",
      "TRANSPORT",
      "POLICY",
      "NATURAL_DISASTER",
      "STRIKE",
      "PANDEMIC",
    ] as const);
    const countryCode = searchParams.get("country")?.toUpperCase();
    const includeResolved = parseBooleanParam(searchParams.get("resolved"));
    const includeExpired = parseBooleanParam(searchParams.get("expired"));

    // ── Build WHERE clause ──────────────────────────────────────────────
    const now = new Date();
    const where: Prisma.TravelAlertWhereInput = {
      isActive: true,
    };

    // By default, exclude resolved alerts unless explicitly requested
    if (!includeResolved) {
      where.isResolved = false;
    }

    // By default, exclude expired alerts unless explicitly requested
    if (!includeExpired) {
      where.OR = [
        { expiresAt: null }, // No expiry set
        { expiresAt: { gte: now } }, // Not yet expired
      ];
    }

    if (severity) {
      where.severity = severity;
    }

    if (alertCategory) {
      where.alertCategory = alertCategory;
    }

    if (countryCode) {
      where.countryCode = countryCode;
    }

    // ── Execute query ───────────────────────────────────────────────────
    const [alerts, totalCount] = await prisma.$transaction([
      prisma.travelAlert.findMany({
        where,
        orderBy: [
          // EMERGENCY > CRITICAL > WARNING > INFO
          { severity: "desc" },
          { issuedAt: "desc" },
        ],
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          message: true,
          severity: true,
          alertCategory: true,
          segment: true,
          affectedCountry: true,
          countryCode: true,
          affectedRegions: true,
          affectedCities: true,
          sourceUrl: true,
          issuedBy: true,
          issuedAt: true,
          expiresAt: true,
          isActive: true,
          isResolved: true,
          resolvedAt: true,
          resolutionNote: true,
          latitude: true,
          longitude: true,
          radiusKm: true,
          createdAt: true,
        },
      }),
      prisma.travelAlert.count({ where }),
    ]);

    // ── Compute severity summary for dashboard display ──────────────────
    const severityCounts = await prisma.travelAlert.groupBy({
      by: ["severity"],
      where: {
        isActive: true,
        isResolved: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } },
        ],
      },
      _count: { severity: true },
    });

    const severitySummary = {
      emergency: severityCounts.find((s) => s.severity === "EMERGENCY")?._count.severity ?? 0,
      critical: severityCounts.find((s) => s.severity === "CRITICAL")?._count.severity ?? 0,
      warning: severityCounts.find((s) => s.severity === "WARNING")?._count.severity ?? 0,
      info: severityCounts.find((s) => s.severity === "INFO")?._count.severity ?? 0,
    };

    return { alerts, totalCount, page, pageSize, severitySummary };
  }, "GET:/api/advisories/alerts");

  if (error) return apiError(error);
  return apiPaginatedSuccess(data.alerts, data.totalCount, data.page, data.pageSize);
}
