// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — /api/news/categorize — AI Categorization Trigger
// POST: Manually triggers a DeepSeek categorization cycle
// Protected by CRON_SECRET for production security
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withErrorBoundary, UnauthorizedError } from "@/lib/errors";
import { runCategorizationCycle } from "@/lib/news-categorizer";

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/news/categorize — Trigger AI Categorization Cycle
// Processes uncategorized DRAFT articles through DeepSeek
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

    // ── Execute categorization cycle ────────────────────────────────────
    const cycleResult = await runCategorizationCycle();
    return cycleResult;
  }, "POST:/api/news/categorize");

  if (error) return apiError(error);
  return apiSuccess(result, undefined, 200);
}
