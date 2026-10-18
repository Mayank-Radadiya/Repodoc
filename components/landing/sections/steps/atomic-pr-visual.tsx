"use client";

import { useState } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  GitBranch,
  Layers,
  FileDiff,
  Play,
  RotateCcw,
} from "lucide-react";

export function AtomicPrVisual() {
  const [activeStage, setActiveStage] = useState<number>(3); // 1 = Blobs, 2 = Tree, 3 = Commit & PR
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStage(1);

    setTimeout(() => {
      setActiveStage(2);
    }, 600);

    setTimeout(() => {
      setActiveStage(3);
      setIsSimulating(false);
    }, 1300);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar: Pipeline Telemetry & Remediation Impact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-emerald-700">
            <GitPullRequest size={14} className="text-emerald-600" />
            <span>Atomic Git Data API:</span>
          </div>
          <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
            1 atomic commit · 0 conflicts
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 font-mono">
          <span>Projected Score Gain:</span>
          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            80 → 100 / 100 (+20 pts)
          </span>
        </div>
      </div>

      {/* Main Split: 3-Stage Pipeline Assembly & Unified Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[300px]">
        {/* Left: 3-Stage DAG Construction Sequence (6 cols) */}
        <div className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers size={14} className="text-emerald-600" />
              <span>Git Data API DAG Assembly</span>
            </div>
            <button
              type="button"
              onClick={runSimulation}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSimulating ? (
                <RotateCcw size={11} className="animate-spin" />
              ) : (
                <Play size={11} className="fill-emerald-700" />
              )}
              {isSimulating ? "Opening PR..." : "Simulate 1-Click PR"}
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] sm:max-h-[260px] pr-1">
            {/* Stage 1: POST /git/blobs */}
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                activeStage === 1
                  ? "border-emerald-500 bg-emerald-50/70 shadow-2xs"
                  : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                  <span className="inline-block size-2 rounded-full bg-blue-500" />
                  1. POST /git/blobs
                </span>
                <span className="font-mono text-[10px] text-slate-500">2 files</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 font-light">
                Writes missing <code className="font-mono text-slate-700">.gitignore</code> and <code className="font-mono text-slate-700">ci.yml</code> as raw blobs without local clone.
              </p>
            </button>

            {/* Stage 2: POST /git/trees */}
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                activeStage === 2
                  ? "border-emerald-500 bg-emerald-50/70 shadow-2xs"
                  : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                  <span className="inline-block size-2 rounded-full bg-purple-500" />
                  2. POST /git/trees
                </span>
                <span className="font-mono text-[10px] text-slate-500">base_tree ref</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 font-light">
                Constructs new tree SHA referencing the parent tree base, injecting only new blob references.
              </p>
            </button>

            {/* Stage 3: POST /git/commits & /git/refs */}
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                activeStage === 3
                  ? "border-emerald-500 bg-emerald-50/70 shadow-2xs"
                  : "border-slate-100 bg-slate-50/40 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                  3. POST /git/commits & refs
                </span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                  PR Ready
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 font-light">
                Creates signed atomic commit and idempotently pushes to branch <code className="font-mono text-slate-700">repodoc/health-remediation</code>.
              </p>
            </button>
          </div>

          <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Branch: repodoc/health-remediation</span>
            <span className="text-emerald-600 font-semibold">100% Idempotent</span>
          </div>
        </div>

        {/* Right: Unified Reviewable PR & Diff View (6 cols) */}
        <div className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileDiff size={13} className="text-slate-500" />
              Generated Atomic Commit Diff
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <GitBranch size={11} />
              <span>PR #14</span>
            </div>
          </div>

          {/* Unified Diff Box */}
          <div className="bg-slate-950 text-slate-100 p-3 rounded-lg font-mono text-[11px] flex-1 overflow-x-auto space-y-1">
            <div className="text-slate-500 text-[10px] pb-1 border-b border-slate-800">
              diff --git a/.gitignore b/.gitignore
            </div>
            <div className="text-slate-400">new file mode 100644</div>
            <div className="text-emerald-400">+ # Node.js dependencies</div>
            <div className="text-emerald-400">+ node_modules/</div>
            <div className="text-emerald-400">+ .env*.local</div>
            <div className="text-emerald-400">+ dist/</div>
            <div className="text-emerald-400">+ npm-debug.log*</div>
            <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-800 mt-2">
              diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
            </div>
            <div className="text-slate-400">new file mode 100644</div>
            <div className="text-emerald-400">+ name: CI</div>
            <div className="text-emerald-400">+ on: [push, pull_request]</div>
          </div>

          {/* PR Result Card */}
          <div className="mt-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-xs font-mono text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold">PR #14 Created:</span>
                <span className="text-slate-600 text-[11px] block font-sans">
                  &quot;Fix missing repository hygiene (2 files)&quot;
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Ready to Merge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AtomicPrVisual;
