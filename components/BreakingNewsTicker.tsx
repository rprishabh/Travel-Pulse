// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — BreakingNewsTicker Component
// Top-pinned marquee banner fetching live alerts and key travel announcements.
// Features hover-pause, responsive states, and zero-layout-shift design.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Flame, ArrowRight, ShieldAlert } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  link: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";
}

const FALLBACK_TICKER_ITEMS: TickerItem[] = [
  {
    id: "fb-1",
    text: "⚡ India expands e-Visa eligibility to additional European & Latin American countries.",
    link: "/visa-hub?segment=inbound",
    severity: "INFO",
  },
  {
    id: "fb-2",
    text: "⚠️ Monsoon advisory: Heavy rainfall warnings issued for parts of Goa, Maharashtra, and Karnataka coast.",
    link: "/travel-advisories",
    severity: "WARNING",
  },
  {
    id: "fb-3",
    text: "🎉 Thailand visa-free entry extended: Indian passport holders enjoy up to 60 days stay with zero fee.",
    link: "/visa-hub?segment=outbound",
    severity: "INFO",
  },
  {
    id: "fb-4",
    text: "🚨 Security advisory: Non-essential travel to high-altitude border sectors discouraged due to weather anomalies.",
    link: "/travel-advisories",
    severity: "CRITICAL",
  },
  {
    id: "fb-5",
    text: "📈 Schengen visa fees revised: New processing tariff applicable globally for all adult applicants.",
    link: "/visa-hub?segment=outbound",
    severity: "INFO",
  },
];

export function BreakingNewsTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_TICKER_ITEMS);

  useEffect(() => {
    async function fetchLiveAlerts() {
      try {
        const res = await fetch("/api/advisories/alerts?pageSize=5&resolved=false");
        if (!res.ok) throw new Error("Alerts fetch failed");
        const json = await res.json();
        
        if (json.success && json.data && json.data.length > 0) {
          const formatted: TickerItem[] = json.data.map((alert: any) => ({
            id: alert.id,
            text: `${alert.severity === "EMERGENCY" || alert.severity === "CRITICAL" ? "🚨" : "⚠️"} [${alert.alertCategory}] ${alert.title}: ${alert.message.substring(0, 80)}...`,
            link: `/travel-advisories?q=${encodeURIComponent(alert.countryCode || alert.title)}`,
            severity: alert.severity,
          }));
          setItems(formatted);
        }
      } catch (error) {
        // Silently fall back to default curated items to preserve UX (skills.md §1)
        console.warn("[BreakingNewsTicker] Using offline ticker fallbacks:", error);
      }
    }

    fetchLiveAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchLiveAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine highest severity currently active for ticker badge styling
  const hasEmergency = items.some((item) => item.severity === "EMERGENCY" || item.severity === "CRITICAL");

  return (
    <div
      id="breaking-news-ticker"
      className="h-[2.5rem] bg-surface-950 dark:bg-black border-b border-surface-800 flex items-center overflow-hidden z-[51] relative select-none"
    >
      {/* ── Left Fixed Badge ──────────────────────────────────────────────── */}
      <div className="h-full bg-gradient-to-r from-red-600 to-amber-600 px-4 flex items-center gap-1.5 shrink-0 z-10 shadow-lg relative border-r border-red-700/50">
        <Flame className="w-3.5 h-3.5 text-white animate-pulse-subtle" />
        <span className="font-display font-bold text-[10px] tracking-wider uppercase text-white leading-none">
          Live Alerts
        </span>
        <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-amber-600" />
      </div>

      {/* ── Scrolling Content (Standard Dual Marquee for Loop) ─────────────── */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div className="flex w-max items-center h-full animate-ticker-scroll hover:[animation-play-state:paused] cursor-pointer">
          
          {/* First Marquee Set */}
          <div className="flex items-center gap-16 pr-16 h-full">
            {items.map((item) => (
              <Link
                key={`m1-${item.id}`}
                href={item.link}
                className="flex items-center gap-2 text-caption font-medium text-surface-200 hover:text-white transition-colors duration-150 whitespace-nowrap group"
              >
                <span>{item.text}</span>
                <span className="inline-flex items-center text-brand-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-[10px] font-bold">
                  View <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* Second Marquee Set (Exact Duplicate for Seamless Loop) */}
          <div className="flex items-center gap-16 pr-16 h-full" aria-hidden="true">
            {items.map((item) => (
              <Link
                key={`m2-${item.id}`}
                href={item.link}
                className="flex items-center gap-2 text-caption font-medium text-surface-200 hover:text-white transition-colors duration-150 whitespace-nowrap group"
              >
                <span>{item.text}</span>
                <span className="inline-flex items-center text-brand-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200 text-[10px] font-bold">
                  View <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* ── Right Status Dot ──────────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-2 px-4 h-full bg-surface-950/80 border-l border-surface-800 shrink-0 z-10 text-caption text-surface-400 font-medium">
        <span className={`w-2 h-2 rounded-full ${hasEmergency ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
        <span className="text-[10px] uppercase tracking-wider font-semibold">
          {hasEmergency ? "Disruptions Active" : "Systems Normal"}
        </span>
      </div>
    </div>
  );
}
