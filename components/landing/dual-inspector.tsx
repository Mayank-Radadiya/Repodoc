"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  ShieldCheck,
  GitPullRequest,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { RepoAuditProfile } from "./types";
import { AuditView } from "./audit-view";
import { DiffView } from "./diff-view";

interface DualInspectorProps {
  selectedRepo: RepoAuditProfile;
}

export function DualInspector({ selectedRepo }: DualInspectorProps) {
  const [activeTab, setActiveTab] = useState<"audit" | "diff">("audit");

  const diffCount = selectedRepo.diffFiles.reduce(
    (acc, f) => acc + f.diffLines.filter((l) => l.type === "add").length,
    0
  );

  return (
    <section id="cockpit" className="relative scroll-mt-24 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-mono text-xs font-medium text-sky-300">
            <Terminal className="size-3.5" />
            <span>Interactive Repository Cockpit</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Audit Diagnostics &amp; Atomic PR Remediation
          </h2>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Toggle between the live 100-point rubric breakdown and the atomic multi-file Git diff.
          </p>
        </div>

        {/* ── Centerpiece Mac Window Chrome ── */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#080c14] shadow-[0_20px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
          {/* Mac Titlebar */}
          <div className="flex flex-col gap-3 border-b border-white/8 bg-[#0c121d] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Window Controls & URL bar */}
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                <span className="size-3 rounded-full bg-red-500/80" />
                <span className="size-3 rounded-full bg-amber-500/80" />
                <span className="size-3 rounded-full bg-emerald-500/80" />
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-white/6 bg-black/40 px-3 py-1 font-mono text-xs text-slate-300">
                <Lock className="size-3 text-slate-500" />
                <span className="text-slate-500">repodoc.dev/audit/</span>
                <span className="text-emerald-400 font-semibold">{selectedRepo.fullName}</span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center rounded-lg border border-white/8 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "audit"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "audit" && (
                  <motion.div
                    layoutId="cockpit-active-tab"
                    className="absolute inset-0 rounded-md bg-white/12 border border-white/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <ShieldCheck className="relative z-10 size-3.5 text-emerald-400" />
                <span className="relative z-10">Audit Diagnostics</span>
                <span className="relative z-10 rounded bg-white/10 px-1.5 py-0.2 font-mono text-[10px]">
                  {selectedRepo.totalScore}/100
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("diff")}
                className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "diff"
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {activeTab === "diff" && (
                  <motion.div
                    layoutId="cockpit-active-tab"
                    className="absolute inset-0 rounded-md bg-white/12 border border-white/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <GitPullRequest className="relative z-10 size-3.5 text-sky-400" />
                <span className="relative z-10">Atomic Git PR</span>
                {diffCount > 0 && (
                  <span className="relative z-10 rounded bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[10px] text-emerald-300">
                    +{diffCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {activeTab === "audit" ? (
                <motion.div
                  key="audit-tab"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <AuditView repo={selectedRepo} />
                </motion.div>
              ) : (
                <motion.div
                  key="diff-tab"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <DiffView repo={selectedRepo} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
