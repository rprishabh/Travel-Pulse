// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/visa/[slug] — Single Visa Update API
// GET: Fetch detailed visa requirements for a specific country/segment
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, NotFoundError } from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/visa/:slug — Fetch Single Visa Update
// Returns full visa details including requirements, documents, notes
// Also returns other visa types available for the same country
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [result, error] = await withErrorBoundary(async () => {
    // ── Fetch the visa update ───────────────────────────────────────────
    const visaUpdate = await prisma.visaUpdate.findUnique({
      where: { slug },
    });

    if (!visaUpdate) {
      throw new NotFoundError("Visa update");
    }

    // ── Fetch other visa types for the same country + segment ───────────
    const otherVisaTypes = await prisma.visaUpdate.findMany({
      where: {
        countryCode: visaUpdate.countryCode,
        segment: visaUpdate.segment,
        id: { not: visaUpdate.id },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        visaType: true,
        processingTimeDays: true,
        fee: true,
        feeCurrency: true,
        maxStayDays: true,
        isEVisaAvailable: true,
      },
      orderBy: { visaType: "asc" },
    });

    // ── Fetch active advisories for this country ────────────────────────
    const relatedAdvisories = await prisma.travelAdvisory.findMany({
      where: {
        countryCode: visaUpdate.countryCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        advisoryLevel: true,
        summary: true,
        effectiveFrom: true,
        effectiveUntil: true,
      },
      take: 3,
      orderBy: { issuedAt: "desc" },
    });

    return {
      ...visaUpdate,
      otherVisaTypes,
      relatedAdvisories,
    };
  }, "GET:/api/visa/[slug]");

  if (error) return apiError(error);
  return apiSuccess(result);
}
