"use client";

import { useState } from "react";
import { Lock, Terminal } from "lucide-react";
import { ScoreGauge } from "./score-gauge";
import { FindingsList } from "./findings-list";
import { BadgePreview } from "./badge-preview";

export function HeroObservatory() {
  const [fixed, setFixed] = useState(false);
  const [activeTab, setActiveTab] = useState<"findings" | "badge">("findings");

  const score = fixed ? 100 : 80;
  const badgeColor = score >= 90 ? "#10b981" : "#f59e0b";

  return (
    <section id="observatory" className="relative pt-16 pb-14 lg:pt-24 lg:pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
            Interactive Repository Observatory
          </span>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Audit sample/atlas-cli live.
          </h2>
          <p className="mt-3 text-base font-light text-slate-600 sm:text-lg">
            See the defensible 100-point rubric, inspect AST evidence, and preview
            the shields.io badge and 1-click atomic PR.
          </p>
        </div>

        {/* Browser Chrome Container */}
        <div className="relative mx-auto">
          {/* Subtle ambient glow */}
          <div className="animate-pulse-slow absolute -inset-1 top-0 right-0 left-0 rounded-2xl bg-gradient-to-r from-[#209BFF] to-[#54A1FD] opacity-20 blur-xl" />

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Window title bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-white px-4 py-1 font-mono text-xs text-slate-500 shadow-xs border border-slate-200/60">
                <Lock size={11} className="text-slate-400" />
                repodoc.dev/report/sample/atlas-cli
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Rubric v1.0
              </div>
            </div>

            {/* Observatory Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Left Score Cockpit (5 cols) */}
              <ScoreGauge
                fixed={fixed}
                onToggleFixed={() => setFixed(!fixed)}
                score={score}
                badgeColor={badgeColor}
              />

              {/* Right Findings & Evidence Details (7 cols) */}
              <div className="p-6 sm:p-8 lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab("findings")}
                        className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${
                          activeTab === "findings"
                            ? "border-[#005FD6] text-[#005FD6]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Rubric Findings (12 checks)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("badge")}
                        className={`text-sm font-semibold transition-colors pb-1 border-b-2 ${
                          activeTab === "badge"
                            ? "border-[#005FD6] text-[#005FD6]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Shields.io Badge API
                      </button>
                    </div>

                    <span className="font-mono text-xs text-slate-400">
                      AST Parsed in 0.8ms
                    </span>
                  </div>

                  {activeTab === "findings" ? (
                    <FindingsList fixed={fixed} />
                  ) : (
                    <BadgePreview
                      fixed={fixed}
                      score={score}
                      badgeColor={badgeColor}
                    />
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Terminal size={13} />
                    Single-roundtrip recursive Git tree inspection
                  </span>
                  <a
                    href="#fix-playground"
                    className="font-medium text-[#005FD6] hover:underline"
                  >
                    View Diff Playground →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroObservatory;
