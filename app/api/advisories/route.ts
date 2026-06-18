// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/advisories — Travel Advisories API
// GET: Filterable travel advisories with severity classification
// knowledge.md §1: Inbound — health/safety advisories
// knowledge.md §2: Outbound — changing geopolitical travel updates
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
// GET /api/advisories — Fetch Travel Advisories
// Supports: pagination, segment, severity level, country, active status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const [data, error] = await withErrorBoundary(async () => {
    const { searchParams } = request.nextUrl;

    // ── Parse query parameters ──────────────────────────────────────────
    const { page, pageSize, skip } = parsePagination(searchParams);
    const segment = parseEnumParam(searchParams.get("segment"), [
      "INBOUND",
      "OUTBOUND",
      "DOMESTIC",
      "ENTERPRISE",
    ] as const);
    const level = parseEnumParam(searchParams.get("level"), [
      "LEVEL_1_EXERCISE_NORMAL",
      "LEVEL_2_EXERCISE_INCREASED",
      "LEVEL_3_RECONSIDER_TRAVEL",
      "LEVEL_4_DO_NOT_TRAVEL",
    ] as const);
    const countryCode = searchParams.get("country")?.toUpperCase();
    const isActive = parseBooleanParam(searchParams.get("active"));
    const search = searchParams.get("q");

    // ── Build WHERE clause ──────────────────────────────────────────────
    const where: Prisma.TravelAdvisoryWhereInput = {
      isActive: isActive ?? true, // Default to active advisories only
    };

    if (segment) {
      where.segment = segment;
    }

    if (level) {
      where.advisoryLevel = level;
    }

    if (countryCode) {
      where.countryCode = countryCode;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { countryName: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { affectedRegions: { has: search } },
      ];
    }

    // ── Execute query ───────────────────────────────────────────────────
    const [advisories, totalCount] = await prisma.$transaction([
      prisma.travelAdvisory.findMany({
        where,
        orderBy: [
          { advisoryLevel: "desc" }, // Most severe first
          { issuedAt: "desc" },
        ],
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          countryName: true,
          countryCode: true,
          segment: true,
          advisoryLevel: true,
          summary: true,
          affectedRegions: true,
          issuedBy: true,
          issuedAt: true,
          effectiveFrom: true,
          effectiveUntil: true,
          sourceUrl: true,
          isActive: true,
          healthRisks: true,
          securityRisks: true,
          updatedAt: true,
        },
      }),
      prisma.travelAdvisory.count({ where }),
    ]);

    return { advisories, totalCount, page, pageSize };
  }, "GET:/api/advisories");

  if (error) return apiError(error);
  return apiPaginatedSuccess(data.advisories, data.totalCount, data.page, data.pageSize);
}
