// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/advisories/[slug] — Single Advisory API
// GET: Fetch detailed travel advisory by slug
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, NotFoundError } from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/advisories/:slug — Fetch Single Advisory
// Returns full advisory details with related alerts and visa info
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [result, error] = await withErrorBoundary(async () => {
    // ── Fetch the advisory ──────────────────────────────────────────────
    const advisory = await prisma.travelAdvisory.findUnique({
      where: { slug },
    });

    if (!advisory) {
      throw new NotFoundError("Travel advisory");
    }

    // ── Fetch active alerts for the same country ────────────────────────
    const relatedAlerts = await prisma.travelAlert.findMany({
      where: {
        countryCode: advisory.countryCode,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        message: true,
        severity: true,
        alertCategory: true,
        issuedAt: true,
        expiresAt: true,
        affectedRegions: true,
        affectedCities: true,
      },
      take: 5,
      orderBy: { issuedAt: "desc" },
    });

    // ── Fetch visa info for the same country (if outbound advisory) ─────
    const relatedVisaUpdates = await prisma.visaUpdate.findMany({
      where: {
        countryCode: advisory.countryCode,
        segment: advisory.segment,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        visaType: true,
        isVisaRequired: true,
        isVisaOnArrival: true,
        isEVisaAvailable: true,
        processingTimeDays: true,
        fee: true,
        feeCurrency: true,
      },
      take: 5,
    });

    // ── Fetch other advisories for the same country ─────────────────────
    const otherAdvisories = await prisma.travelAdvisory.findMany({
      where: {
        countryCode: advisory.countryCode,
        id: { not: advisory.id },
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        advisoryLevel: true,
        segment: true,
        issuedAt: true,
      },
      take: 3,
      orderBy: { issuedAt: "desc" },
    });

    // ── Fetch related news articles ─────────────────────────────────────
    const relatedArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { slug: "travel-advisory" },
        OR: [
          { title: { contains: advisory.countryName, mode: "insensitive" } },
          { seoKeywords: { has: advisory.countryName.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImageUrl: true,
        publishedAt: true,
        sourceName: true,
      },
      take: 4,
      orderBy: { publishedAt: "desc" },
    });

    return {
      ...advisory,
      relatedAlerts,
      relatedVisaUpdates,
      otherAdvisories,
      relatedArticles,
    };
  }, "GET:/api/advisories/[slug]");

  if (error) return apiError(error);
  return apiSuccess(result);
}
