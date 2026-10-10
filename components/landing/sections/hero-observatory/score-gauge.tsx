"use client";

import { GitBranch, GitPullRequest } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { OBSERVATORY_CATEGORIES } from "../../data/observatory";

export interface ScoreGaugeProps {
  fixed: boolean;
  onToggleFixed: () => void;
  score: number;
  badgeColor: string;
}

export function ScoreGauge({
  fixed,
  onToggleFixed,
  score,
  badgeColor,
}: ScoreGaugeProps) {
  const reduceMotion = useReducedMotion();

  return (
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
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  ease: "easeOut",
                }}
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
          {OBSERVATORY_CATEGORIES.map((cat) => {
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
          onClick={onToggleFixed}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
        >
          <GitPullRequest size={14} className="text-emerald-400" />
          {fixed
            ? "Reset to Unfixed State"
            : "Simulate 1-Click Fix PR (+20 pts)"}
        </button>
      </div>
    </div>
  );
}
