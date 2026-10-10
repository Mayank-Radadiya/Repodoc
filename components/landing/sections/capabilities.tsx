"use client";

import { useState } from "react";
import { CAPABILITIES } from "../data/capabilities";

export function Capabilities() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      id="capabilities"
      className="py-16 sm:py-24 lg:py-28 bg-slate-50/50 border-t border-slate-200/70"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
            Deep-Tech Capabilities
          </span>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything the Engine Does
          </h2>
          <p className="mt-3 text-base font-light text-slate-600 sm:text-lg">
            Built from low-level Git primitives to ensure mathematical defensibility,
            rate-limit endurance, and clean repository hygiene.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, idx) => (
            <div
              key={cap.title}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative bg-white p-8 border border-slate-200/80 rounded-2xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Dashed blueprint border lines */}
              <div className="pointer-events-none absolute top-2 -left-1 w-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute -top-1 left-2 h-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute -top-1 right-2 h-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute bottom-2 -left-1 w-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />

              <div className="flex items-center justify-between mb-6">
                <div
                  className={`h-12 w-12 ${cap.iconClass} flex items-center justify-center rounded-xl transition-transform duration-200 ${
                    hoveredIndex === idx ? "scale-110" : ""
                  }`}
                >
                  <cap.icon size={22} strokeWidth={2.2} />
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  {cap.badge}
                </span>
              </div>

              <h3 className="mb-2 text-base font-bold tracking-[0.03em] text-slate-900">
                {cap.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 font-light">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Capabilities;
