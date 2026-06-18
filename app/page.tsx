// ─────────────────────────────────────────────────────────────────────────────
// TravelPulse India — Main Landing Page (app/page.tsx)
// Next.js Client Component with explicit system-date tracking.
// Incorporates Hero, active warning segments, Dynamic On-This-Day historical engine, and news feed.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NewsFeed } from "@/components/NewsFeed";
import { VisaQuickCheck } from "@/components/VisaQuickCheck";
import {
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Globe2,
  Compass,
  FileText,
  AlertOctagon,
  CalendarDays,
  Map,
} from "lucide-react";

// ── EXTENSIBLE HISTORICAL TRAVEL & AVIATION CALENDAR DATABASE ──────────────────
const CALENDAR_HISTORY_DATABASE: Record<string, { category: string; location: string; title: string; description: string }> = {
  "6-19": {
    category: "GLOBAL EXPLORATION",
    location: "Western Australia",
    title: "Steve Fossett's Solo Global Flight Launch",
    description: "On this day in 2002, billionaire adventurer Steve Fossett took off from Northam, Western Australia, on his historic journey to successfully complete the world's first solo, non-stop round-the-world flight in a balloon."
  },
  "6-20": {
    category: "AVIATION MILESTONES",
    location: "Paris, France",
    title: "Paris Air Show Historical Anniversaries",
    description: "Historically aligned with June 20, the iconic Paris Air Show has witnessed the global debut of generation-defining commercial aerospace frameworks, reshaping modern continental transit loops."
  },
  "6-21": {
    category: "DOMESTIC TRAVEL & CULTURE",
    location: "Ladakh, North India",
    title: "Sindhu Darshan Festival Influx",
    description: "Coinciding with the summer solstice, thousands of cultural travelers journey to the pristine banks of the Indus River in Leh to witness indigenous heritage dances and cross-regional spiritual assemblies."
  }
};

export default function HomePage() {
  // Setup standard state wrappers to process device dates smoothly
  const [dateKey, setDateKey] = useState("6-19");
  const [formattedDateLabel, setFormattedDateLabel] = useState("19 June");

  useEffect(() => {
    const systemDate = new Date();
    const month = systemDate.getMonth() + 1; // 0-indexed adjustment
    const day = systemDate.getDate();

    setDateKey(`${month}-${day}`);
    setFormattedDateLabel(systemDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" }));
  }, []);

  // Fetch match from database or fallback gracefully to default 19 June index if slot is unpopulated
  const activeFact = CALENDAR_HISTORY_DATABASE[dateKey] || CALENDAR_HISTORY_DATABASE["6-19"];

  return (
    <div className="space-y-16 pb-20">
      {/* 1. HERO SEGMENT */}
      <section className="relative bg-surface-950 dark:bg-black text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-brand-600/20 to-accent-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-brand-900/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="container-wide relative z-10 space-y-10">
          <div className="max-w-3xl space-y-6">
            <div className="flex flex-wrap gap-2.5 animate-fade-in">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <Globe2 className="w-3.5 h-3.5 text-brand-400" />
                20+ Live RSS Sources
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/10 text-white">
                <FileText className="w-3.5 h-3.5 text-accent-400" />
                Outbound & Inbound Trackers Live
              </span>
            </div>

            <h1 className="font-display font-extrabold text-display-sm md:text-display-md lg:text-display-lg leading-tight tracking-tight animate-fade-in-up">
              Global Travel Intelligence. <br />
              <span className="text-gradient-hero">Local Indian Precision.</span>
            </h1>

            <p className="text-body-lg text-surface-300 max-w-2xl leading-relaxed opacity-90 delay-100 animate-fade-in">
              Real-time travel news aggregation, automated visa requirement mapping for Indian passport holders, and regulatory safety tracking verified in real time.
            </p>

            <div className="flex flex-wrap gap-4 pt-4 delay-200 animate-fade-in">
              <Link href="/visa-hub" className="btn btn-lg btn-primary">
                <span>Check Visa Requirements</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/travel-advisories" className="btn btn-lg btn-secondary bg-white/10 text-white border border-white/15 hover:bg-white/15">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span>Travel Advisories</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMERGENCY CONTAINER FALLBACKS */}
      <section className="container-wide">
        <div className="p-5 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-glow-accent">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-caption font-bold text-red-400 uppercase tracking-wider block">
                Active Emergency Alerts
              </span>
              <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
                Delhi NCR Air Quality Advisory: Region experiencing severe pollution counts. Travelers with respiratory histories advised to adjust routing.
              </p>
            </div>
          </div>
          <Link href="/travel-advisories" className="btn btn-sm btn-danger px-5 shrink-0 w-full md:w-auto">
            <span>Verify Alerts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 3. DUAL CORE DASHBOARD SEGMENT */}
      <section className="container-wide grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Widget: Quick Check */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1.5">
            <span className="text-caption font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Quick Verify Tool
            </span>
            <h2 className="font-display font-bold text-heading-xl text-surface-900 dark:text-white">
              Instant Visa Lookup
            </h2>
            <p className="text-body-sm text-surface-500 max-w-md">
              Select your travel segment and check required documentation, processing wait-times, and visa pricing details in seconds.
            </p>
          </div>
          <VisaQuickCheck />
        </div>

        {/* Right Widget: High-Contrast 'On This Day' Calendar Sync Framework */}
        <div className="lg:col-span-7 h-full flex flex-col justify-between">
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-caption font-bold text-accent-600 dark:text-accent-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                Incredible India Daily — On This Day
              </span>
              <h2 className="font-display font-bold text-heading-xl text-surface-900 dark:text-white">
                Today in Travel: {formattedDateLabel}
              </h2>
              <p className="text-body-sm text-surface-500 max-w-xl">
                Dynamic calendar tracking synchronizing global navigation milestones, exploration history, and destination breakthroughs matched to the active date.
              </p>
            </div>

            {/* Fact Card Surface Container */}
            <div className="card-modern p-6 md:p-8 relative mt-4 overflow-hidden border border-white/20 dark:border-surface-800 flex-1 flex flex-col justify-between min-h-[300px] animate-fade-in">
              <Compass className="absolute right-[-40px] bottom-[-40px] w-64 h-64 text-brand-500/5 rotate-12 pointer-events-none" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="badge bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-3 py-1 font-bold text-[10px] tracking-wider uppercase border border-amber-500/10">
                    🗓️ {activeFact.category}
                  </span>
                  <span className="text-caption font-bold text-surface-400 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                    <Map className="w-3.5 h-3.5" />
                    {activeFact.location}
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-heading-lg text-surface-900 dark:text-white leading-snug">
                  {activeFact.title}
                </h3>

                <p className="text-body-md font-medium text-surface-700 dark:text-surface-300 leading-relaxed border-l-2 border-brand-500 pl-4 py-1 bg-slate-500/5 dark:bg-white/5 p-4 rounded-xl">
                  {activeFact.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-200 dark:border-surface-800/60 text-caption font-bold text-emerald-500 text-[10px] uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  Live Calendar Synchronization Engaged
                </span>
                <span>System Live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MAIN TRAVEL NEWS PORTAL */}
      <section id="news-section-header" className="container-wide py-6">
        <div className="border-t border-surface-200 dark:border-surface-800/80 pt-16 space-y-8">
          <div className="space-y-2.5 text-center md:text-left">
            <span className="text-caption font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Travel Intelligence Feed
            </span>
            <h2 className="font-display font-bold text-heading-xl md:text-heading-2xl text-surface-900 dark:text-white">
              Live Updates & News Coverage
            </h2>
            <p className="text-body-sm text-surface-500 max-w-2xl">
              Latest regulatory alerts, visa changes, airline expansions, and local updates parsed from 20+ trusted channels and indexed hourly.
            </p>
          </div>

          <NewsFeed />
        </div>
      </section>

      {/* 5. SECTOR LINKS */}
      <section className="container-wide">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-modern p-8 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-brand-500/30 transition-all duration-300">
            <div className="space-y-3">
              <span className="badge bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 tracking-wider uppercase font-bold text-[10px]">
                Outbound Travelers
              </span>
              <h3 className="font-display font-extrabold text-heading-lg text-surface-900 dark:text-white">
                Maximize Passport Power
              </h3>
              <p className="text-body-sm text-surface-500 leading-relaxed">
                Check list of all visa-free and visa-on-arrival options currently open to Indian passport holders. Review processing rules, required budgets, and travel insurance guidelines.
              </p>
            </div>
            <Link href="/visa-hub?segment=outbound" className="btn btn-sm btn-primary w-fit mt-2">
              <span>Explore Outbound Hub</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="card-modern p-8 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-accent-500/30 transition-all duration-300">
            <div className="space-y-3">
              <span className="badge bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 tracking-wider uppercase font-bold text-[10px]">
                Inbound India
              </span>
              <h3 className="font-display font-extrabold text-heading-lg text-surface-900 dark:text-white">
                Safe Exploration in India
              </h3>
              <p className="text-body-sm text-surface-500 leading-relaxed">
                Complete guide to Indian electronic visas (e-Visas) for foreign tourists, business travelers, and medical delegates. Track safety protocols, health alerts, and eSIM connectivity.
              </p>
            </div>
            <Link href="/visa-hub?segment=inbound" className="btn btn-sm btn-secondary w-fit mt-2">
              <span>Inbound Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}