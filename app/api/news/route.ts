// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/news — News Articles API
// GET: Paginated, filterable article listing
// Production-grade Next.js App Router API route with expanded Enum validations
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiPaginatedSuccess,
  apiError,
  parsePagination,
  parseEnumParam,
  parseBooleanParam,
  parseDateParam,
} from "@/lib/api-response";
import { withErrorBoundary } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

// THESE TWO LINES TO DISABLE NEXT.JS CACHING
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const [data, error] = await withErrorBoundary(async () => {
    const { searchParams } = request.nextUrl;

    // ── Parse query parameters ──────────────────────────────────────────
    const { page, pageSize, skip } = parsePagination(searchParams);
    const category = searchParams.get("category");

    // UPDATED: Added GLOBAL parsing permission to allow automatic scraper tracking
    const segment = parseEnumParam(searchParams.get("segment"), [
      "INBOUND",
      "OUTBOUND",
      "DOMESTIC",
      "ENTERPRISE",
      "GLOBAL",
    ] as const);

    const status = parseEnumParam(searchParams.get("status"), [
      "DRAFT",
      "PUBLISHED",
      "ARCHIVED",
      "FLAGGED",
    ] as const);

    const source = searchParams.get("source");
    const isFeatured = parseBooleanParam(searchParams.get("featured"));
    const search = searchParams.get("q");
    const fromDate = parseDateParam(searchParams.get("from"));
    const toDate = parseDateParam(searchParams.get("to"));
    const tag = searchParams.get("tag");
    const sortBy = searchParams.get("sort") ?? "publishedAt";
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

    // ── Build dynamic WHERE clause ──────────────────────────────────────
    const where: Prisma.ArticleWhereInput = {}; // UNLOCKED: Fetch absolutely everything in the database!

    // If the frontend tab is filtering for "ALL", it hits /api/news without segment query parameters
    if (segment) {
      where.segment = segment;
    }

    if (category) {
      where.category = { slug: category };
    }

    if (source) {
      where.OR = [
        { sourceName: { contains: source, mode: "insensitive" } },
        { newsSource: { slug: source } },
      ];
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { summary: { contains: search, mode: "insensitive" } },
            { seoKeywords: { has: search.toLowerCase() } },
          ],
        },
      ];
    }

    if (fromDate || toDate) {
      where.publishedAt = {};
      if (fromDate) where.publishedAt.gte = fromDate;
      if (toDate) where.publishedAt.lte = toDate;
    }

    if (tag) {
      where.tags = { some: { slug: tag } };
    }

    // ── Build ORDER BY ──────────────────────────────────────────────────
    const allowedSortFields = [
      "publishedAt",
      "fetchedAt",
      "viewCount",
      "shareCount",
      "createdAt",
    ];
    const resolvedSortBy = allowedSortFields.includes(sortBy) ? sortBy : "publishedAt";

    const orderBy: Prisma.ArticleOrderByWithRelationInput = {
      [resolvedSortBy]: sortOrder,
    };

    // ── Execute query with count ────────────────────────────────────────
    const [articles, totalCount] = await prisma.$transaction([
      prisma.article.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverImageUrl: true,
          sourceUrl: true,
          sourceName: true,
          sourceLogoUrl: true,
          author: true,
          publishedAt: true,
          status: true,
          segment: true,
          tone: true,
          readTimeMinutes: true,
          viewCount: true,
          isFeatured: true,
          isPinned: true,
          seoTitle: true,
          seoDescription: true,
          // SAFE FALLBACK: Removed strict relational dependencies that cause empty joins
        },
      }),
      prisma.article.count({ where }),
    ]);

    return { articles, totalCount, page, pageSize };
  }, "GET:/api/news");

  if (error) return apiError(error);
  return apiPaginatedSuccess(data.articles, data.totalCount, data.page, data.pageSize);
}