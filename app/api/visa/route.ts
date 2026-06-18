// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/visa — Visa Updates API
// GET: Filterable visa requirement listings
// knowledge.md §1: Inbound — complex multi-city visa documentation
// knowledge.md §2: Outbound — live visa processing times, VoA changes
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
// GET /api/visa — Fetch Visa Updates
// Supports: pagination, segment filter, country filter, visa type,
//           visa-free/VoA/eVisa flags, sort by processing time
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
    const visaType = parseEnumParam(searchParams.get("type"), [
      "TOURIST",
      "BUSINESS",
      "MEDICAL",
      "CONFERENCE",
      "E_VISA",
      "VISA_ON_ARRIVAL",
      "TRANSIT",
      "STUDENT",
      "EMPLOYMENT",
      "JOURNALIST",
      "DIPLOMATIC",
    ] as const);
    const countryCode = searchParams.get("country")?.toUpperCase();
    const isVisaFree = parseBooleanParam(searchParams.get("visaFree"));
    const isVisaOnArrival = parseBooleanParam(searchParams.get("voa"));
    const isEVisaAvailable = parseBooleanParam(searchParams.get("evisa"));
    const search = searchParams.get("q");
    const sortBy = searchParams.get("sort") ?? "countryName";

    // ── Build WHERE clause ──────────────────────────────────────────────
    const where: Prisma.VisaUpdateWhereInput = {
      isActive: true,
    };

    if (segment) {
      where.segment = segment;
    }

    if (visaType) {
      where.visaType = visaType;
    }

    if (countryCode) {
      where.countryCode = countryCode;
    }

    if (isVisaFree !== undefined) {
      where.isVisaRequired = !isVisaFree;
    }

    if (isVisaOnArrival !== undefined) {
      where.isVisaOnArrival = isVisaOnArrival;
    }

    if (isEVisaAvailable !== undefined) {
      where.isEVisaAvailable = isEVisaAvailable;
    }

    if (search) {
      where.OR = [
        { countryName: { contains: search, mode: "insensitive" } },
        { countryCode: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    // ── Build ORDER BY ──────────────────────────────────────────────────
    const allowedSortFields = [
      "countryName",
      "processingTimeDays",
      "fee",
      "maxStayDays",
      "updatedAt",
    ];
    const resolvedSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "countryName";
    const sortOrder = searchParams.get("order") === "desc" ? "desc" : "asc";

    const orderBy: Prisma.VisaUpdateOrderByWithRelationInput = {
      [resolvedSortBy]: sortOrder,
    };

    // ── Execute query ───────────────────────────────────────────────────
    const [visaUpdates, totalCount] = await prisma.$transaction([
      prisma.visaUpdate.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          countryName: true,
          countryCode: true,
          flagEmoji: true,
          segment: true,
          visaType: true,
          isVisaRequired: true,
          isVisaOnArrival: true,
          isEVisaAvailable: true,
          processingTimeDays: true,
          validityDays: true,
          maxStayDays: true,
          multipleEntry: true,
          fee: true,
          feeCurrency: true,
          applicationUrl: true,
          requirements: true,
          documentsRequired: true,
          notes: true,
          lastVerifiedAt: true,
          effectiveFrom: true,
          effectiveUntil: true,
          arrivalCardRequired: true,
          yellowFeverRequired: true,
          updatedAt: true,
        },
      }),
      prisma.visaUpdate.count({ where }),
    ]);

    return { visaUpdates, totalCount, page, pageSize };
  }, "GET:/api/visa");

  if (error) return apiError(error);
  return apiPaginatedSuccess(data.visaUpdates, data.totalCount, data.page, data.pageSize);
}
