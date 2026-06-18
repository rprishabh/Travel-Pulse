// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/news/sources — News Sources API
// GET: List all registered news sources with health metadata
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, parseBooleanParam } from "@/lib/api-response";
import { withErrorBoundary } from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/news/sources — List News Sources
// Optional: ?active=true to filter only active sources
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const [sources, error] = await withErrorBoundary(async () => {
    const { searchParams } = request.nextUrl;
    const isActive = parseBooleanParam(searchParams.get("active"));

    const sources = await prisma.newsSource.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: [{ trustScore: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        websiteUrl: true,
        rssUrl: true,
        scraperType: true,
        logoUrl: true,
        isActive: true,
        trustScore: true,
        fetchInterval: true,
        lastFetchedAt: true,
        lastErrorAt: true,
        lastError: true,
        articleCount: true,
        createdAt: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    return sources;
  }, "GET:/api/news/sources");

  if (error) return apiError(error);
  return apiSuccess(sources);
}
