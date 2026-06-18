// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/news/[slug] — Single Article API
// GET: Fetch a single article by slug with full content
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, NotFoundError } from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/news/:slug — Fetch Single Article
// Increments view count atomically, returns full content with relations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [article, error] = await withErrorBoundary(async () => {
    // ── Fetch article with full relations ──────────────────────────────
    const found = await prisma.article.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            iconName: true,
            colorHex: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        newsSource: {
          select: {
            id: true,
            name: true,
            slug: true,
            websiteUrl: true,
            logoUrl: true,
            trustScore: true,
          },
        },
      },
    });

    if (!found) {
      throw new NotFoundError("Article");
    }

    // ── Increment view count atomically (fire-and-forget) ───────────────
    // Non-blocking: don't await, don't let view count failure break the response
    prisma.article
      .update({
        where: { id: found.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => {
        console.warn("[API:news/slug] View count increment failed:", err);
      });

    // ── Fetch related articles from the same category ───────────────────
    const relatedArticles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: found.id },
        categoryId: found.categoryId ?? undefined,
      },
      take: 4,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImageUrl: true,
        publishedAt: true,
        readTimeMinutes: true,
        sourceName: true,
        category: {
          select: {
            name: true,
            slug: true,
            colorHex: true,
          },
        },
      },
    });

    return {
      ...found,
      relatedArticles,
    };
  }, "GET:/api/news/[slug]");

  if (error) return apiError(error);
  return apiSuccess(article);
}
