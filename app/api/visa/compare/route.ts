// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/visa/compare — Visa Comparison API
// GET: Side-by-side comparison of visa requirements for multiple countries
// knowledge.md §2: Outbound — maximizing passport power
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, BadRequestError } from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/visa/compare?countries=THA,SGP,MYS&segment=OUTBOUND
// Returns visa data for up to 5 countries for side-by-side comparison
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const [result, error] = await withErrorBoundary(async () => {
    const { searchParams } = request.nextUrl;

    // ── Parse countries parameter ───────────────────────────────────────
    const countriesParam = searchParams.get("countries");
    if (!countriesParam) {
      throw new BadRequestError(
        "Missing required 'countries' parameter. Provide comma-separated ISO 3166-1 alpha-3 codes (e.g., countries=THA,SGP,MYS)."
      );
    }

    const countryCodes = countriesParam
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length === 3)
      .slice(0, 5); // Max 5 countries

    if (countryCodes.length === 0) {
      throw new BadRequestError(
        "No valid country codes provided. Use ISO 3166-1 alpha-3 format (e.g., THA, SGP, MYS)."
      );
    }

    const segment = searchParams.get("segment")?.toUpperCase() ?? "OUTBOUND";

    // ── Fetch visa data for all requested countries ──────────────────────
    const visaUpdates = await prisma.visaUpdate.findMany({
      where: {
        countryCode: { in: countryCodes },
        segment: segment as any,
        isActive: true,
        visaType: "TOURIST", // Compare tourist visas by default
      },
      orderBy: { countryName: "asc" },
      select: {
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
        requirements: true,
        documentsRequired: true,
        arrivalCardRequired: true,
        yellowFeverRequired: true,
        notes: true,
      },
    });

    // ── Build comparison summary ────────────────────────────────────────
    const comparison = {
      countries: visaUpdates,
      summary: {
        totalCountries: visaUpdates.length,
        visaFreeCount: visaUpdates.filter((v) => !v.isVisaRequired).length,
        voaCount: visaUpdates.filter((v) => v.isVisaOnArrival).length,
        eVisaCount: visaUpdates.filter((v) => v.isEVisaAvailable).length,
        fastestProcessing: visaUpdates.reduce(
          (min, v) =>
            v.processingTimeDays !== null && v.processingTimeDays < min
              ? v.processingTimeDays
              : min,
          Infinity
        ),
        cheapest: visaUpdates.reduce(
          (min, v) =>
            v.fee !== null && v.fee < min.fee
              ? { country: v.countryName, fee: v.fee, currency: v.feeCurrency ?? "" }
              : min,
          { country: "", fee: Infinity, currency: "" }
        ),
        longestStay: visaUpdates.reduce(
          (max, v) =>
            v.maxStayDays !== null && v.maxStayDays > max
              ? v.maxStayDays
              : max,
          0
        ),
      },
    };

    return comparison;
  }, "GET:/api/visa/compare");

  if (error) return apiError(error);
  return apiSuccess(result);
}
