"use client";

import { useState } from "react";
import {
  Lock,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  GitPullRequest,
  Terminal,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const CATEGORIES = [
  { name: "Documentation", score: 25, max: 25, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Hygiene", score: 15, max: 20, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Testing & CI", score: 10, max: 25, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Community", score: 15, max: 15, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Security", score: 15, max: 15, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export function HeroObservatory() {
  const [fixed, setFixed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"findings" | "badge">("findings");
  const reduceMotion = useReducedMotion();

  const score = fixed ? 100 : 80;
  const badgeColor = score >= 90 ? "#10b981" : "#f59e0b";

  const handleCopyBadge = () => {
    navigator.clipboard.writeText(
      "[![Repo Health](https://img.shields.io/endpoint?url=https://repolens.dev/api/badge/sample/atlas-cli)](https://repolens.dev/report/sample/atlas-cli)",
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
                repolens.dev/report/sample/atlas-cli
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                Rubric v1.0
              </div>
            </div>

            {/* Observatory Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Left Score Cockpit (5 cols) */}
              <div className="p-6 sm:p-8 lg:col-span-5 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                        CLI
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          sample/atlas-cli
                        </h3>
                        <p className="font-mono text-xs text-slate-500 flex items-center gap-1">
                          <GitBranch size={11} /> main (commit 4b29ef7)
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-700">
                      Node.js CLI
                    </span>
                  </div>

                  {/* Circular Gauge */}
                  <div className="mt-8 flex items-center justify-center gap-6">
                    <div className="relative flex items-center justify-center">
                      <svg viewBox="0 0 120 120" className="size-28 -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke={badgeColor}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="314.16"
                          initial={false}
                          animate={{ strokeDashoffset: 314.16 * (1 - score / 100) }}
                          transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="font-display text-3xl font-extrabold text-slate-900">
                          {score}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                          / 100 pts
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Audit Health
                      </span>
                      <h4 className="font-display text-xl font-bold text-slate-900">
                        {fixed ? "Flawless Hygiene" : "Good Baseline"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fixed
                          ? "All 12 checks verified passing."
                          : "2 missing files identified."}
                      </p>
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="mt-6 flex flex-col gap-2">
                    {CATEGORIES.map((cat) => {
                      const displayScore = fixed ? cat.max : cat.score;
                      return (
                        <div
                          key={cat.name}
                          className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs shadow-2xs"
                        >
                          <span className="font-medium text-slate-700">{cat.name}</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {displayScore} / {cat.max} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 1-Click Atomic PR Simulation Button */}
                <div className="mt-6 pt-5 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFixed(!fixed)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
                  >
                    <GitPullRequest size={14} className="text-emerald-400" />
                    {fixed ? "Reset to Unfixed State" : "Simulate 1-Click Fix PR (+20 pts)"}
                  </button>
                </div>
              </div>

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
                    <div className="mt-4 flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {/* Gaps / Remediations */}
                      {!fixed && (
                        <>
                          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
                            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900">
                                  Missing .gitignore (Hygiene)
                                </h4>
                                <span className="font-mono text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                                  +5 pts available
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-slate-600">
                                Evaluated root directory: no .gitignore detected for Node manifest.
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
                            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900">
                                  Missing CI Workflow (Testing & CI/CD)
                                </h4>
                                <span className="font-mono text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                                  +15 pts available
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-slate-600">
                                Evaluated .github/workflows/*.yml: no automated CI workflow found.
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Passed checks */}
                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">
                              README Essential Headings (10 pts)
                            </h4>
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Passed
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            AST detected `## Installation` and `## Usage` headings in README.md.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">
                              OSI Open Source License (10 pts)
                            </h4>
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Passed
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            MIT license detected at root LICENSE.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900">
                              Security Reporting Policy (10 pts)
                            </h4>
                            <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Passed
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            SECURITY.md vulnerability disclosure instructions present.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Badge Endpoint Preview Tab */
                    <div className="mt-4 flex flex-col gap-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400">
                          <span>GET /api/badge/sample/atlas-cli</span>
                          <span className="text-emerald-400">200 OK (304 Cacheable)</span>
                        </div>
                        <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`{
  "schemaVersion": 1,
  "label": "repo health",
  "message": "${score}/100",
  "color": "${fixed ? "brightgreen" : "green"}"
}`}
                        </pre>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4">
                        <div>
                          <p className="text-xs font-medium text-slate-500">Live Shields.io Badge</p>
                          <div className="mt-2 inline-flex items-center rounded overflow-hidden shadow-xs border border-slate-300 text-[11px] font-sans">
                            <span className="bg-slate-700 text-white px-2 py-0.5 font-medium">
                              repo health
                            </span>
                            <span
                              className="px-2 py-0.5 font-bold text-white transition-colors"
                              style={{ backgroundColor: badgeColor }}
                            >
                              {score}/100
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyBadge}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copied ? "Copied snippet" : "Copy Markdown"}
                        </button>
                      </div>
                    </div>
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
