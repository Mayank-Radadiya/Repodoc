"use client";

import {
  FileCode2,
  GitBranch,
  Activity,
  CheckCircle2,
  FileCheck,
  GitPullRequest,
  Check,
  Scale,
  Layers,
} from "lucide-react";
import { LineSvg, StraightLine, PulseBorderIcon } from "./bento-circuits";

const RECENT_AUDITS = [
  {
    repo: "facebook/react",
    score: "96/100",
    time: "2m ago",
    status: "verified",
    note: "Clean AST headings, valid LICENSE",
  },
  {
    repo: "astral-sh/uv",
    score: "92/100",
    time: "14m ago",
    status: "verified",
    note: "Cargo manifest detected (Rust CLI)",
  },
  {
    repo: "sample/atlas-cli",
    score: "80/100",
    time: "24m ago",
    status: "fix_ready",
    note: "2 hygiene files ready to commit",
  },
  {
    repo: "vercel/next.js",
    score: "95/100",
    time: "1h ago",
    status: "verified",
    note: "Complete monorepo workflow suite",
  },
];

export function PlatformBento() {
  return (
    <section id="features" className="py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
            Platform Architecture
          </span>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Low-level Git Data API. Defensible scoring.
          </h2>
          <p className="mt-3 text-base font-light text-slate-600 sm:text-lg">
            Every feature runs off single-roundtrip tree lookups, structured AST evidence,
            and atomic multi-file Git commit pipelines.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {/* Card 1: 100-Point Scoring Rubric */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Scale className="size-4 text-[#005FD6]" />
              100-Point Defensible Rubric (v1.0)
            </div>
            <p className="mt-2 text-sm font-light text-slate-600">
              Evaluates structured Markdown AST headings and repository presence rather than
              arbitrary word count proxies.
            </p>

            <div className="relative mt-6 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-3">
                <span className="font-mono text-xs font-semibold text-slate-700">
                  Rubric Categories & Weights
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 border border-slate-200">
                  100 max pts
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-slate-800">Documentation (AST Headings)</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-600">25 pts</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-slate-800">Testing & Automated CI</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-600">25 pts</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium text-slate-800">Project Hygiene & License</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-600">20 pts</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-medium text-slate-800">Community & Security Baseline</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-purple-600">30 pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Live Git Tree Audit Stream */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Activity className="size-4 text-[#209BFF]" />
              Single-Call Tree Audit Stream
            </div>
            <p className="mt-2 text-sm font-light text-slate-600">
              Resolves 90%+ repository checks in a single recursive tree fetch with zero
              quota consumption on 304 Not Modified cache hits.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              {RECENT_AUDITS.map((item) => (
                <div
                  key={item.repo}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <GitBranch size={13} />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-800">{item.repo}</p>
                      <p className="text-[11px] text-slate-500 font-light">{item.note}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{item.score}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        item.status === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "verified" ? "Audit OK" : "Fix Ready"}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-2xs text-xs text-slate-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span>Conditional ETag caching: 304 consumes 0 rate-limit quota</span>
              </div>
            </div>
          </div>

          {/* Card 3 (2 cols wide): Atomic Git Data API PR Engine */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <GitPullRequest className="size-4 text-[#005FD6]" />
                  Atomic Git Data API PR Engine (&ldquo;Fix All&rdquo;)
                </div>
                <p className="mt-1 text-sm font-light text-slate-600 max-w-3xl">
                  Low-level Git Data API pipeline opens one clean pull request from an idempotent
                  branch without messy multi-commit churn or partial checkouts.
                </p>
              </div>
              <span className="hidden sm:inline-block rounded-full bg-blue-50 px-3 py-1 font-mono text-xs font-bold text-[#005FD6] border border-blue-200">
                POST /git/blobs → trees → commits
              </span>
            </div>

            {/* Circuit Visualization */}
            <div className="relative mx-auto mt-10 h-64 max-w-4xl border border-slate-200/80 rounded-2xl bg-slate-50/50 p-6 flex flex-col justify-center overflow-hidden">
              {/* Responsive fallback for mobile */}
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-mono">
                  <FileCode2 size={15} className="text-blue-500" />
                  <span>POST /git/blobs: LICENSE (SPDX)</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-mono">
                  <FileCode2 size={15} className="text-blue-500" />
                  <span>POST /git/blobs: .gitignore</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-mono">
                  <FileCode2 size={15} className="text-purple-500" />
                  <span>POST /git/trees: .github/workflows/ci.yml</span>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white p-2.5 text-xs font-bold">
                  <Check size={14} />
                  <span>Atomic Commit Opened on branch repodoc/health-remediation</span>
                </div>
              </div>

              {/* Desktop Animated Circuits */}
              <div className="relative hidden sm:block h-full w-full">
                {/* 3 Generator nodes on the left */}
                <div className="absolute top-4 left-6 flex flex-col gap-6 z-10">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-mono shadow-2xs">
                    <FileCheck size={14} className="text-[#005FD6]" />
                    <span>LICENSE (MIT / Apache-2.0)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-mono shadow-2xs">
                    <FileCode2 size={14} className="text-[#209BFF]" />
                    <span>.gitignore (Template)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-xs font-mono shadow-2xs">
                    <Layers size={14} className="text-emerald-600" />
                    <span>.github/workflows/ci.yml</span>
                  </div>
                </div>

                {/* SVG Circuit Lines connecting left to center */}
                <LineSvg className="top-8 left-64" color="#005FD6" />
                <StraightLine className="top-28 left-56" color="#209BFF" />
                <LineSvg className="top-36 left-64 rotate-x-180" color="#10b981" />

                {/* Central Processor Node with dual animated border pulse */}
                <PulseBorderIcon className="top-20 left-[58%]" />

                {/* Output PR Commit on the right */}
                <div className="absolute top-16 right-6 z-10 max-w-xs rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={14} />
                    Atomic PR Opened #14
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-emerald-700">
                    repodoc/health-remediation
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600 font-light">
                    1 commit · +2 files · 0 merge conflicts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlatformBento;
