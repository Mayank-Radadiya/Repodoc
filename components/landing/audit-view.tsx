"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
  FileCode,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { RepoAuditProfile, RubricCheckItem } from "./types";
import { RUBRIC_CATEGORIES } from "./sample-report";

interface AuditViewProps {
  repo: RepoAuditProfile;
}

export function AuditView({ repo }: AuditViewProps) {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(
    repo.checks.find((c) => !c.passed)?.id || repo.checks[0]?.id || null
  );
  const [copiedBadge, setCopiedBadge] = useState(false);

  const badgeMarkdown = `[![Repodoc Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/${repo.owner}/${repo.repo})](https://repodoc.dev/report/${repo.owner}/${repo.repo})`;

  const handleCopyBadge = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (repo.totalScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* ── Top Metric Strip ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Score Radial Card */}
        <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-[#0e1420]/80 p-4">
          <div className="relative size-20 shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/10"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-700 ease-out ${
                  repo.totalScore >= 90
                    ? "text-emerald-400"
                    : repo.totalScore >= 70
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-mono text-xl font-bold text-white">
                {repo.totalScore}
              </span>
              <span className="text-[10px] font-medium text-slate-400">/100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-white">
                Grade {repo.letterGrade} Health
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                  repo.totalScore >= 90
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                Defensible
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-snug">
              {repo.passedCount} of {repo.checksCount} rubric rules passed with structured AST evidence.
            </p>
          </div>
        </div>

        {/* Dynamic Shields.io Badge Card */}
        <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#0e1420]/80 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-slate-300">
              Shields.io Badge
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-sky-400">
              <Sparkles className="size-3" />
              Live CDN
            </span>
          </div>

          <div className="my-2 flex items-center justify-start">
            <div className="inline-flex overflow-hidden rounded font-mono text-[11px] shadow-sm">
              <span className="bg-[#24292e] px-2.5 py-1 text-white font-medium">
                repodoc
              </span>
              <span
                className={`px-2.5 py-1 font-semibold text-slate-950 ${
                  repo.totalScore >= 90
                    ? "bg-emerald-400"
                    : repo.totalScore >= 70
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              >
                {repo.totalScore}/100
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyBadge}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/4 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-white/8 hover:text-white transition-colors"
          >
            <span className="truncate max-w-[200px]">Copy badge markdown</span>
            {copiedBadge ? (
              <Check className="size-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="size-3.5 text-slate-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Engine Traversal Telemetry */}
        <div className="flex flex-col justify-between rounded-xl border border-white/8 bg-[#0e1420]/80 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-slate-300">
              Tree Traversal
            </span>
            <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-400">
              Single-call
            </span>
          </div>

          <div className="my-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">In-memory parse:</span>
              <span className="font-mono text-emerald-400">&lt;1 ms</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total duration:</span>
              <span className="font-mono text-slate-200">{repo.durationMs} ms</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Project type:</span>
              <span className="font-mono text-sky-300 uppercase text-[11px]">
                {repo.projectType}
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-500">
            Adapted scoring (zero library app file penalties)
          </span>
        </div>
      </div>

      {/* ── Category Score Progress Bars ── */}
      <div className="rounded-xl border border-white/8 bg-[#0e1420]/60 p-4">
        <h4 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
          5-Category Weighting Distribution
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {RUBRIC_CATEGORIES.map((cat) => {
            const catChecks = repo.checks.filter((c) => c.category === cat.id);
            const awarded = catChecks.reduce((acc, c) => acc + c.pointsAwarded, 0);
            const percent = Math.round((awarded / cat.maxPoints) * 100);

            return (
              <div
                key={cat.id}
                className="rounded-lg border border-white/6 bg-white/2 p-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300 truncate">
                    {cat.label}
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    {awarded}/{cat.maxPoints}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent >= 85
                        ? "bg-emerald-400"
                        : percent >= 60
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Defensible Evidence Checklist ── */}
      <div className="rounded-xl border border-white/8 bg-[#0e1420]/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
            Defensible Evidence & AST Heading Tokens
          </h4>
          <span className="text-xs text-slate-500">Click any check to inspect</span>
        </div>

        <div className="space-y-2">
          {repo.checks.map((check) => {
            const isExpanded = expandedCheck === check.id;

            return (
              <div
                key={check.id}
                className="overflow-hidden rounded-lg border border-white/6 bg-black/30 transition-colors hover:border-white/12"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                  className="flex w-full items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    {check.passed ? (
                      <CheckCircle2 className="size-4.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-4.5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-medium text-slate-200 sm:text-sm">
                        {check.name}
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        ({check.pointsAwarded}/{check.maxPoints} pts)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {check.remediation?.canAutomate && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                        1-Click PR Fix
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="size-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/6 bg-white/2 p-3.5 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FileCode className="size-3.5 text-sky-400" />
                      <span>Files inspected:</span>
                      <span className="font-mono text-slate-200">
                        {check.evidence.filesChecked.join(", ")}
                      </span>
                    </div>
                    <div className="rounded bg-black/40 p-2.5 font-mono text-[11px] text-slate-300 border border-white/4">
                      {check.evidence.details}
                    </div>
                    {check.remediation && (
                      <div className="flex items-center justify-between rounded bg-amber-500/5 border border-amber-500/20 p-2 text-amber-200">
                        <span>{check.remediation.description}</span>
                        <span className="font-mono text-[11px] text-amber-300 shrink-0">
                          Target: {check.remediation.targetPath}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
