// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — News Fetcher (RSS + Cheerio)
// Safely parses designated Indian and international RSS channels
// skills.md §1: Deep error boundaries and data fallback loops
// for all background workers and fetch cron tasks
// ─────────────────────────────────────────────────────────────────────────────

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import {
  withRetry,
  withTimeout,
  withErrorBoundary,
  ExternalServiceError,
} from "@/lib/errors";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedFeedItem {
  title: string;
  link: string;
  description: string;
  content: string;
  author: string | null;
  publishedAt: Date;
  categories: string[];
  imageUrl: string | null;
  guid: string;
}

export interface FeedParseResult {
  feedTitle: string;
  feedDescription: string;
  items: ParsedFeedItem[];
  fetchedAt: Date;
}

export interface FetchSourceResult {
  sourceId: string;
  sourceName: string;
  sourceSlug: string;
  newArticlesCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

export interface FetchCycleResult {
  jobId: string;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalNewArticles: number;
  totalSkipped: number;
  sourceResults: FetchSourceResult[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const RSS_FETCH_TIMEOUT_MS = 15_000;
const RSS_MAX_RETRIES = 2;
const RSS_RETRY_BASE_DELAY_MS = 1_000;
const MAX_ARTICLES_PER_SOURCE = parseInt(
  process.env.RSS_MAX_ARTICLES_PER_SOURCE ?? "25",
  10
);
const USER_AGENT =
  process.env.RSS_USER_AGENT ??
  "TravelPulse-India/1.0 (+https://travelpulse.in)";

// ═══════════════════════════════════════════════════════════════════════════════
// RSS XML PARSER (using Cheerio in XML mode)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses raw RSS/Atom XML into a structured FeedParseResult.
 */
export function parseRssFeed(xmlContent: string, sourceUrl: string): FeedParseResult {
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const items: ParsedFeedItem[] = [];
  const fetchedAt = new Date();

  const isAtom = $("feed").length > 0;
  const isRss = $("rss").length > 0 || $("channel").length > 0;

  if (!isAtom && !isRss) {
    throw new ExternalServiceError(
      sourceUrl,
      "Unrecognized feed format — expected RSS 2.0 or Atom XML"
    );
  }

  let feedTitle = "";
  let feedDescription = "";

  if (isRss) {
    feedTitle = $("channel > title").first().text().trim();
    feedDescription = $("channel > description").first().text().trim();
  } else {
    feedTitle = $("feed > title").first().text().trim();
    feedDescription = $("feed > subtitle").first().text().trim();
  }

  const itemSelector = isRss ? "item" : "entry";
  const itemElements = $(itemSelector);

  itemElements.each((_index, element) => {
    try {
      const $item = $(element);
      const item = isRss
        ? parseRssItem($item, $)
        : parseAtomEntry($item, $);

      if (item && item.title && item.link) {
        items.push(item);
      }
    } catch (itemError) {
      console.warn(
        `[NewsFetcher] Skipping malformed item in ${sourceUrl}:`,
        itemError instanceof Error ? itemError.message : itemError
      );
    }
  });

  return {
    feedTitle,
    feedDescription,
    items: items.slice(0, MAX_ARTICLES_PER_SOURCE),
    fetchedAt,
  };
}

function parseRssItem(
  $item: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): ParsedFeedItem {
  const title = cleanText($item.find("title").first().text());
  const link = cleanText(
    $item.find("link").first().text() || $item.find("guid").first().text()
  );
  const guid = cleanText(
    $item.find("guid").first().text() || link
  );

  const contentEncoded = $item.find("content\\:encoded").first().text();
  const descriptionRaw = $item.find("description").first().text();
  const rawContent = contentEncoded || descriptionRaw || "";

  const description = stripHtml(rawContent).slice(0, 500);
  const content = rawContent;

  const author =
    cleanText($item.find("author").first().text()) ||
    cleanText($item.find("dc\\:creator").first().text()) ||
    null;

  const pubDateStr =
    $item.find("pubDate").first().text() ||
    $item.find("dc\\:date").first().text();
  const publishedAt = parseFeedDate(pubDateStr);

  const categories: string[] = [];
  $item.find("category").each((_i, el) => {
    const cat = cleanText($(el).text());
    if (cat) categories.push(cat);
  });

  const imageUrl = extractImageUrl($item, $, rawContent);

  return {
    title,
    link,
    description,
    content,
    author,
    publishedAt,
    categories,
    imageUrl,
    guid,
  };
}

function parseAtomEntry(
  $entry: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI
): ParsedFeedItem {
  const title = cleanText($entry.find("title").first().text());

  const link = cleanText(
    $entry.find('link[rel="alternate"]').first().attr("href") ||
    $entry.find("link").first().attr("href") ||
    ""
  );
  const guid = cleanText($entry.find("id").first().text() || link);

  const contentRaw =
    $entry.find("content").first().text() ||
    $entry.find("summary").first().text() ||
    "";
  const description = stripHtml(contentRaw).slice(0, 500);
  const content = contentRaw;

  const author =
    cleanText($entry.find("author > name").first().text()) || null;

  const dateStr =
    $entry.find("published").first().text() ||
    $entry.find("updated").first().text();
  const publishedAt = parseFeedDate(dateStr);

  const categories: string[] = [];
  $entry.find("category").each((_i, el) => {
    const term = $(el).attr("term") || $(el).text();
    if (term) categories.push(cleanText(term));
  });

  const imageUrl = extractImageUrl($entry, $, contentRaw);

  return {
    title,
    link,
    description,
    content,
    author,
    publishedAt,
    categories,
    imageUrl,
    guid,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEED FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchRssFeedXml(rssUrl: string): Promise<string> {
  const fetchOperation = async (): Promise<string> => {
    const response = await withTimeout(
      fetch(rssUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
        },
        next: { revalidate: 300 },
      }),
      RSS_FETCH_TIMEOUT_MS,
      `RSS:${rssUrl}`
    );

    if (!response.ok) {
      throw new ExternalServiceError(
        rssUrl,
        `HTTP ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    if (
      !contentType.includes("xml") &&
      !contentType.includes("rss") &&
      !text.trimStart().startsWith("<?xml") &&
      !text.trimStart().startsWith("<rss") &&
      !text.trimStart().startsWith("<feed")
    ) {
      throw new ExternalServiceError(
        rssUrl,
        `Response is not valid XML (Content-Type: ${contentType})`
      );
    }

    return text;
  };

  return withRetry(
    fetchOperation,
    `FetchRSS:${rssUrl}`,
    RSS_MAX_RETRIES,
    RSS_RETRY_BASE_DELAY_MS
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE-LEVEL FETCH ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFromSource(source: {
  id: string;
  name: string;
  slug: string;
  rssUrl: string | null;
  scraperType: string;
}): Promise<FetchSourceResult> {
  const result: FetchSourceResult = {
    sourceId: source.id,
    sourceName: source.name,
    sourceSlug: source.slug,
    newArticlesCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (!source.rssUrl) {
    result.errors.push(`Source "${source.name}" has no RSS URL configured`);
    result.errorCount = 1;
    return result;
  }

  try {
    const xml = await fetchRssFeedXml(source.rssUrl);
    const feed = parseRssFeed(xml, source.rssUrl);

    for (const item of feed.items) {
      try {
        const existing = await prisma.article.findUnique({
          where: { sourceUrl: item.link },
          select: { id: true },
        });

        if (existing) {
          result.skippedCount++;
          continue;
        }

        const slug = generateSlug(item.title);
        const wordCount = stripHtml(item.content).split(/\s+/).length;
        const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 238));

        const defaultCategory = await prisma.category.findFirst({ select: { id: true } });

        await prisma.article.create({
          data: {
            slug,
            title: item.title,
            summary: item.description || item.title,
            content: item.content || item.description || item.title,
            coverImageUrl: item.imageUrl,
            sourceUrl: item.link,
            sourceName: source.name,
            author: item.author || "Pulse Desk",
            publishedAt: item.publishedAt,
            readTimeMinutes,
            seoTitle: item.title.slice(0, 70),
            seoDescription: (item.description || item.title).slice(0, 160),
            seoKeywords: item.categories.slice(0, 10),
            newsSourceId: source.id,
            categoryId: defaultCategory?.id || undefined,
            segment: "GLOBAL",
            status: "DRAFT",
          },
        });

        result.newArticlesCount++;
      } catch (itemError) {
        if (
          itemError instanceof Error &&
          "code" in itemError &&
          (itemError as any).code === "P2002"
        ) {
          result.skippedCount++;
          continue;
        }

        result.errorCount++;
        result.errors.push(
          `Failed to persist "${item.title.slice(0, 50)}...": ${itemError instanceof Error ? itemError.message : String(itemError)}`
        );
      }
    }

    await prisma.newsSource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
        articleCount: { increment: result.newArticlesCount },
      },
    });
  } catch (sourceError) {
    result.errorCount++;
    const errorMessage = sourceError instanceof Error ? sourceError.message : String(sourceError);
    result.errors.push(errorMessage);

    try {
      await prisma.newsSource.update({
        where: { id: source.id },
        data: {
          lastErrorAt: new Date(),
          lastError: errorMessage.slice(0, 500),
        },
      });
    } catch (updateError) {
      console.error(`[NewsFetcher] Failed to update error metadata for ${source.name}:`, updateError);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL FETCH CYCLE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function runFetchCycle(): Promise<FetchCycleResult> {
  const startedAt = new Date();

  const cronJob = await prisma.cronJobLog.create({
    data: {
      jobName: "rss-fetch-cycle",
      status: "RUNNING",
      startedAt,
    },
  });

  const sourceResults: FetchSourceResult[] = [];

  try {
    const activeSources = await prisma.newsSource.findMany({
      where: {
        isActive: true,
        rssUrl: { not: null },
        scraperType: "rss",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        rssUrl: true,
        scraperType: true,
        fetchInterval: true,
        lastFetchedAt: true,
      },
      orderBy: { lastFetchedAt: "asc" },
    });

    const dueSources = activeSources;

    console.log(`[NewsFetcher] Forced manual override loop active: Processing ${dueSources.length} profiles.`);

    for (const source of dueSources) {
      const [result, error] = await withErrorBoundary(
        () => fetchFromSource(source),
        `FetchSource:${source.slug}`
      );

      if (result) {
        sourceResults.push(result);
        console.log(`[NewsFetcher]   ✅ ${source.name}: ${result.newArticlesCount} new, ${result.skippedCount} skipped`);
      } else {
        sourceResults.push({
          sourceId: source.id,
          sourceName: source.name,
          sourceSlug: source.slug,
          newArticlesCount: 0,
          skippedCount: 0,
          errorCount: 1,
          errors: [error?.message ?? "Unknown error"],
        });
        console.error(`[NewsFetcher]   ❌ ${source.name}: ${error?.message}`);
      }
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();
    const totalNewArticles = sourceResults.reduce((sum, r) => sum + r.newArticlesCount, 0);
    const totalSkipped = sourceResults.reduce((sum, r) => sum + r.skippedCount, 0);
    const failedSources = sourceResults.filter((r) => r.errorCount > 0).length;
    const successfulSources = sourceResults.length - failedSources;

    await prisma.cronJobLog.update({
      where: { id: cronJob.id },
      data: {
        status: failedSources > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        completedAt,
        duration,
        itemsProcessed: totalNewArticles,
        itemsFailed: failedSources,
      },
    });

    if (totalNewArticles > 0) {
      console.log(`[NewsFetcher] 🤖 Triggering automatic categorization cycle for ${totalNewArticles} new draft articles...`);
      try {
        const { runCategorizationCycle } = await import("./news-categorizer");
        await runCategorizationCycle();
      } catch (catError) {
        console.error("[NewsFetcher] ❌ Failed to run automatic categorization:", catError);
      }
    }

    return {
      jobId: cronJob.id,
      startedAt,
      completedAt,
      duration,
      totalSources: dueSources.length,
      successfulSources,
      failedSources,
      totalNewArticles,
      totalSkipped,
      sourceResults,
    };
  } catch (error) {
    const completedAt = new Date();
    await prisma.cronJobLog.update({
      where: { id: cronJob.id },
      data: {
        status: "FAILED",
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      },
    });
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function stripHtml(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html, { xmlMode: false });
  return $.text().replace(/\s+/g, " ").trim();
}

/`*/
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractImageUrl(
  $item: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
  htmlContent: string
): string | null {
  const mediaUrl =
    $item.find("media\\:content").first().attr("url") ||
    $item.find("media\\:thumbnail").first().attr("url");
  if (mediaUrl) return mediaUrl;

  const enclosure = $item.find("enclosure").first();
  if (enclosure.length > 0) {
    const encType = enclosure.attr("type") ?? "";
    if (encType.startsWith("image/")) {
      return enclosure.attr("url") || null;
    }
  }

  const imageTag = $item.find("image > url").first().text();
  if (imageTag) return imageTag;

  if (htmlContent) {
    const $content = cheerio.load(htmlContent, { xmlMode: false });
    const imgSrc = $content("img").first().attr("src");
    if (imgSrc && imgSrc.startsWith("http")) return imgSrc;
  }

  return null;
}

function parseFeedDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

// ── CLI RUNTIME HANDLER ──────────────────────────────────────────────────────
if (typeof process !== 'undefined' && process.argv[1]?.replace(/\\/g, "/").endsWith("lib/news-fetcher.ts")) {
  console.log("==================================================");
  console.log("🛰️  TRAVELPULSE INDIA — MANUAL ENGINE INGESTION");
  console.log("==================================================");

  runFetchCycle()
    .then((res) => {
      console.log(`\n🎉 INGESTION CYCLE COMPLETE`);
      console.log(`⚡ Job Status: SUCCESS`);
      console.log(`📰 Total Articles Inserted: ${res.totalNewArticles}`);
      console.log(`⏭️  Articles Skipped: ${res.totalSkipped}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n❌ CATASTROPHIC ENGINE CRASH:`, err);
      process.exit(1);
    });
}