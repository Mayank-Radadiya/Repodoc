"use client";

import { useState } from "react";
import {
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  CheckCircle2,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  proposedFiles,
  sampleScore,
  missingChecks,
} from "../../data/sample-report";
import { DiffViewer, type FixItem } from "./diff-viewer";

const FIXES: FixItem[] = missingChecks.map((check, index) => ({
  ...check,
  file: proposedFiles[index],
  label:
    check.id === "gitignore"
      ? "Add Node.js .gitignore"
      : "Add Automated CI Workflow",
  detail:
    check.id === "gitignore"
      ? "Exclude node_modules, local .env files, and build output from Git."
      : "Run automated tests on push and pull requests via GitHub Actions.",
}));

export function FixPlayground() {
  const [selected, setSelected] = useState(FIXES.map((fix) => fix.id));
  const [previewId, setPreviewId] = useState(FIXES[0].id);
  const reduceMotion = useReducedMotion();

  const selectedFixes = FIXES.filter((fix) => selected.includes(fix.id));
  const points = selectedFixes.reduce((sum, fix) => sum + fix.maxPoints, 0);
  const score = sampleScore + points;
  const preview =
    selectedFixes.find((fix) => fix.id === previewId) ?? selectedFixes[0];

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <section id="fix-playground" className="py-16 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
            Interactive Remediation Lab
          </span>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose a fix. See the difference.
          </h2>
          <p className="mt-3 text-base font-light text-slate-600 sm:text-lg">
            Two missing hygiene files stand between this sample repo and a 100/100 score.
            Preview the atomic diff and watch the projected score climb.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Choice Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Projected Repository Health
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-slate-400">
                      {sampleScore}
                    </span>
                    <span className="text-slate-400">→</span>
                    <motion.span
                      key={score}
                      initial={reduceMotion ? false : { opacity: 0.5, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-4xl font-extrabold text-[#005FD6]"
                    >
                      {score}
                    </motion.span>
                    <span className="font-mono text-xs text-slate-400">/ 100 pts</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                  +{points} pts gained
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-5">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: `${score}%` }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full rounded-full bg-gradient-to-r from-[#005FD6] to-[#209BFF]"
                  />
                </div>
              </div>

              {/* Checkboxes for Fixes */}
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select missing files to bundle:
                </p>
                {FIXES.map((fix) => {
                  const isChecked = selected.includes(fix.id);
                  return (
                    <label
                      key={fix.id}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-150 ${
                        isChecked
                          ? "border-[#005FD6] bg-blue-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(fix.id)}
                        className="mt-1 size-4 rounded text-[#005FD6] focus:ring-[#005FD6]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">
                            {fix.label}
                          </h4>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            +{fix.maxPoints} pts
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 font-light">
                          {fix.detail}
                        </p>
                        <code className="mt-1.5 inline-block font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {fix.file.path}
                        </code>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Atomic PR Metadata Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-mono font-semibold text-slate-500 uppercase">
                  Atomic Commit Target
                </span>
                <span className="flex items-center gap-1 font-mono text-emerald-600 font-semibold">
                  <CheckCircle2 size={13} />
                  Idempotent
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2 font-mono text-slate-600">
                <div className="flex items-center gap-2">
                  <GitBranch size={13} className="text-slate-400" />
                  <span>
                    Branch: <strong>repodoc/health-remediation</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GitCommitHorizontal size={13} className="text-slate-400" />
                  <span>
                    Commit: <strong>1 single atomic commit SHA</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GitPullRequest size={13} className="text-slate-400" />
                  <span>
                    PR: <strong>Fix missing repository hygiene ({selectedFixes.length} files)</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Diff Viewer (7 cols) */}
          <DiffViewer
            selectedFixes={selectedFixes}
            preview={preview}
            previewId={previewId}
            onSelectPreview={(id) => setPreviewId(id)}
          />
        </div>
      </div>
    </section>
  );
}

export default FixPlayground;
