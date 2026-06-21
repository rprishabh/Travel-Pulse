"use client";

import React, { useEffect, useState } from "react";

const GRADIENTS = [
  "linear-gradient(135deg, #0c1929 0%, #173559 100%)", // Stage 1: Hero Sunrise
  "linear-gradient(135deg, #173559 0%, #ff6b35 100%)", // Stage 2: Cultural India
  "linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)", // Stage 3: Transit/Visa
  "linear-gradient(135deg, #f7931e 0%, #e84393 100%)", // Stage 4: Development
  "linear-gradient(135deg, #e84393 0%, #6c5ce7 100%)", // Stage 5: Alert Globe
  "linear-gradient(135deg, #6c5ce7 0%, #0c1929 100%)", // Stage 6: Sunset Arrival
];

export function JourneyCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const checkMotion = () => {
      const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || 
                        document.documentElement.getAttribute("data-motion") === "off";
      setVisible(!isReduced);
    };

    checkMotion();
    
    const observer = new MutationObserver(checkMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });

    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? window.scrollY / docHeight : 0;
      setScrollProgress(progress);
      
      const idx = Math.min(GRADIENTS.length - 1, Math.floor(progress * GRADIENTS.length));
      setStageIndex(idx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run initial frame position
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none select-none transition-all duration-1000 ease-out"
      style={{
        background: GRADIENTS[stageIndex],
      }}
    >
      {/* Background radial soft light blobs that shift slightly with scroll */}
      <div 
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sunset-1/10 rounded-full blur-[120px] mix-blend-screen transition-transform duration-500"
        style={{ transform: `translate(${scrollProgress * 40}px, ${scrollProgress * -25}px)` }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-sunset-4/10 rounded-full blur-[140px] mix-blend-screen transition-transform duration-500"
        style={{ transform: `translate(${scrollProgress * -40}px, ${scrollProgress * 30}px)` }}
      />

      {/* Modern Flight Connectivity Network Overlay */}
      <svg
        viewBox="0 0 1000 1000"
        className="w-full h-full opacity-20 dark:opacity-30 transition-opacity duration-500"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="flight-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e84393" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0.8" />
          </linearGradient>
          
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7931e" stopOpacity="1" />
            <stop offset="100%" stopColor="#f7931e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Flight Connection Lines */}
        <g stroke="url(#flight-grad)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          {/* JFK -> LHR */}
          <path id="path-jfk-lhr" d="M 150 200 Q 250 180, 350 250" />
          {/* LHR -> DEL */}
          <path id="path-lhr-del" d="M 350 250 Q 420 380, 500 500" />
          {/* DXB -> DEL */}
          <path id="path-dxb-del" d="M 320 550 Q 410 520, 500 500" strokeDasharray="4 4" />
          {/* DEL -> SIN */}
          <path id="path-del-sin" d="M 500 500 Q 600 620, 700 700" />
          {/* SIN -> SYD */}
          <path id="path-sin-syd" d="M 700 700 Q 820 780, 900 850" />
          {/* DEL -> HND */}
          <path id="path-del-hnd" d="M 500 500 Q 700 420, 850 350" />
        </g>

        {/* Animated Flight Particles moving natively along SVG curves */}
        <g fill="#f7931e">
          {/* JFK -> LHR */}
          <circle r="3.5">
            <animateMotion dur="10s" repeatCount="indefinite" path="M 150 200 Q 250 180, 350 250" />
          </circle>
          
          {/* LHR -> DEL */}
          <circle r="3.5">
            <animateMotion dur="12s" repeatCount="indefinite" path="M 350 250 Q 420 380, 500 500" />
          </circle>

          {/* DXB -> DEL */}
          <circle r="3" fill="#ff6b35">
            <animateMotion dur="9s" repeatCount="indefinite" path="M 320 550 Q 410 520, 500 500" />
          </circle>
          
          {/* DEL -> SIN */}
          <circle r="3.5">
            <animateMotion dur="11s" repeatCount="indefinite" path="M 500 500 Q 600 620, 700 700" />
          </circle>

          {/* SIN -> SYD */}
          <circle r="3.5">
            <animateMotion dur="14s" repeatCount="indefinite" path="M 700 700 Q 820 780, 900 850" />
          </circle>

          {/* DEL -> HND */}
          <circle r="3" fill="#e84393">
            <animateMotion dur="13s" repeatCount="indefinite" path="M 500 500 Q 700 420, 850 350" />
          </circle>
        </g>

        {/* City Node Coordinates & Codes */}
        <g className="text-[10px] font-mono fill-ink/40 dark:fill-cream/30 font-semibold select-none">
          {/* DEL */}
          <circle cx="500" cy="500" r="8" fill="url(#node-glow)" />
          <circle cx="500" cy="500" r="3" fill="#f7931e" />
          <text x="512" y="504">DEL (NEW DELHI)</text>

          {/* JFK */}
          <circle cx="150" cy="200" r="6" fill="url(#node-glow)" />
          <circle cx="150" cy="200" r="2" fill="#ff6b35" />
          <text x="162" y="204">JFK (NEW YORK)</text>

          {/* LHR */}
          <circle cx="350" cy="250" r="6" fill="url(#node-glow)" />
          <circle cx="350" cy="250" r="2" fill="#ff6b35" />
          <text x="362" y="254">LHR (LONDON)</text>

          {/* DXB */}
          <circle cx="320" cy="550" r="6" fill="url(#node-glow)" />
          <circle cx="320" cy="550" r="2" fill="#f7931e" />
          <text x="332" y="554">DXB (DUBAI)</text>

          {/* SIN */}
          <circle cx="700" cy="700" r="6" fill="url(#node-glow)" />
          <circle cx="700" cy="700" r="2" fill="#ff6b35" />
          <text x="712" y="704">SIN (SINGAPORE)</text>

          {/* SYD */}
          <circle cx="900" cy="850" r="6" fill="url(#node-glow)" />
          <circle cx="900" cy="850" r="2" fill="#6c5ce7" />
          <text x="812" y="854">SYD (SYDNEY)</text>

          {/* HND */}
          <circle cx="850" cy="350" r="6" fill="url(#node-glow)" />
          <circle cx="850" cy="350" r="2" fill="#e84393" />
          <text x="762" y="354">HND (TOKYO)</text>
        </g>
      </svg>

      {/* Rotating Aviation Compass Rose Overlay */}
      <div className="absolute -bottom-20 -left-20 w-96 h-96 opacity-[0.03] dark:opacity-[0.06] border border-dashed border-white rounded-full animate-[spin_180s_linear_infinite] pointer-events-none flex items-center justify-center">
        <div className="w-0.5 h-full bg-white opacity-20" />
        <div className="h-0.5 w-full bg-white opacity-20 absolute" />
        <div className="w-4/5 h-4/5 border border-dashed border-white rounded-full opacity-40" />
        <div className="w-3/5 h-3/5 border border-white rounded-full opacity-20" />
      </div>

      <div className="absolute -top-20 -right-20 w-80 h-80 opacity-[0.02] dark:opacity-[0.04] border border-dashed border-white rounded-full animate-[spin_120s_linear_infinite] pointer-events-none flex items-center justify-center">
        <div className="w-0.5 h-full bg-white opacity-20" />
        <div className="h-0.5 w-full bg-white opacity-20 absolute" />
      </div>
    </div>
  );
}
