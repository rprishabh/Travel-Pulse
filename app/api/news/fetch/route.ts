// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/news/fetch — RSS Fetch Trigger
// POST: Manually triggers an RSS fetch cycle
// Protected by CRON_SECRET for production security
// skills.md §1: Deep error boundaries for background workers
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, UnauthorizedError } from "@/lib/errors";
import { runFetchCycle } from "@/lib/news-fetcher";

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/news/fetch — Trigger RSS Fetch Cycle
// Requires CRON_SECRET authorization header in production
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const [result, error] = await withErrorBoundary(async () => {
    // ── Authorization check ─────────────────────────────────────────────
    if (process.env.NODE_ENV === "production") {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("x-cron-secret");

      if (!cronSecret) {
        throw new UnauthorizedError(
          "CRON_SECRET is not configured. Set it in .env for production."
        );
      }

      const token = authHeader?.replace("Bearer ", "");
      if (token !== cronSecret) {
        throw new UnauthorizedError("Invalid cron secret.");
      }
    }

    // ── Execute fetch cycle ─────────────────────────────────────────────
    const cycleResult = await runFetchCycle();
    return cycleResult;
  }, "POST:/api/news/fetch");

  if (error) return apiError(error);
  return apiSuccess(result, undefined, 200);
}
