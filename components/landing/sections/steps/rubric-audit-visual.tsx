"use client";

import { useState } from "react";
import {
  ScanSearch,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ShieldCheck,
  RotateCw,
  Scale,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { MOCK_RUBRIC_CATEGORIES } from "../../data/steps";

interface AstCheckItem {
  id: string;
  category: string;
  rule: string;
  astToken: string;
  points: number;
  status: "pass" | "fail";
  evidence: string;
}

const AST_CHECKS: AstCheckItem[] = [
  {
    id: "license",
    category: "Hygiene",
    rule: "SPDX License Identifier",
    astToken: "RootBlob(LICENSE) -> match(/Apache-2.0/)",
    points: 20,
    status: "pass",
    evidence: "SPDX Apache-2.0 valid in root",
  },
  {
    id: "readme_title",
    category: "Documentation",
    rule: "README H1 Heading",
    astToken: "Heading { depth: 1, text: 'Atlas CLI' }",
    points: 10,
    status: "pass",
    evidence: "H1 title at line 1 of README.md",
  },
  {
    id: "readme_install",
    category: "Documentation",
    rule: "Installation Section",
    astToken: "Heading { depth: 2, text: 'Installation' }",
    points: 10,
    status: "pass",
    evidence: "H2 section with bash codeblock found",
  },
  {
    id: "gitignore",
    category: "Hygiene",
    rule: "Node.js .gitignore",
    astToken: "RootBlob(.gitignore) == null",
    points: -5,
    status: "fail",
    evidence: "Missing from root directory",
  },
  {
    id: "ci_workflow",
    category: "Testing",
    rule: "Automated CI Workflow",
    astToken: "Subtree(.github/workflows/*.yml) == empty",
    points: -10,
    status: "fail",
    evidence: "Zero GitHub Actions workflow files",
  },
];

export function RubricAuditVisual() {
  const [selectedCheck, setSelectedCheck] = useState<AstCheckItem>(AST_CHECKS[3]);
  const [isAuditing, setIsAuditing] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleReAudit = () => {
    if (isAuditing) return;
    setIsAuditing(true);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % AST_CHECKS.length;
      setSelectedCheck(AST_CHECKS[i]);
    }, 350);

    setTimeout(() => {
      clearInterval(interval);
      setSelectedCheck(AST_CHECKS[3]);
      setIsAuditing(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar: Metric and Category Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-sky-700">
            <Scale size={14} className="text-sky-600" />
            <span>Deterministic Health Score:</span>
          </div>
          <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-sky-200 shadow-2xs">
            80 / 100 pts
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 font-mono">
          <span>Speed:</span>
          <span className="text-emerald-600 font-semibold">0.8ms AST parse</span>
        </div>
      </div>

      {/* Main Split: 5 Category Breakdown & AST Evidence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[300px]">
        {/* Left: 5 Rubric Categories with Progress Bars (6 cols) */}
        <div className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ScanSearch size={14} className="text-[#005FD6]" />
              <span>5 Core Scoring Categories</span>
            </div>
            <button
              type="button"
              onClick={handleReAudit}
              disabled={isAuditing}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RotateCw size={11} className={isAuditing ? "animate-spin" : ""} />
              {isAuditing ? "Parsing AST..." : "Re-evaluate Rubric"}
            </button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[220px] sm:max-h-[260px] pr-1">
            {MOCK_RUBRIC_CATEGORIES.map((cat) => {
              const pct = (cat.score / cat.weight) * 100;
              const isFull = cat.score === cat.weight;

              return (
                <div
                  key={cat.name}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat.name}</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      {cat.score} / {cat.weight} pts
                    </span>
                  </div>

                  <div className="mt-1.5 h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <motion.div
                      initial={shouldReduceMotion ? false : { width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        isFull
                          ? "bg-emerald-500"
                          : pct >= 70
                            ? "bg-sky-500"
                            : "bg-amber-500"
                      }`}
                    />
                  </div>

                  <p className="mt-1 font-mono text-[10px] text-slate-500 truncate">
                    {cat.checksSummary}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>12 deterministic tests</span>
            <span>0 subjective heuristics</span>
          </div>
        </div>

        {/* Right: Interactive AST Evidence Inspector (6 cols) */}
        <div className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileCode size={13} className="text-slate-500" />
              AST Evidence Token Stream
            </span>
            <span className="font-mono text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              AST ASTv1
            </span>
          </div>

          {/* Checks Selector */}
          <div className="space-y-1.5 mb-3 max-h-[120px] overflow-y-auto">
            {AST_CHECKS.map((check) => {
              const isSelected = selectedCheck.id === check.id;
              return (
                <button
                  key={check.id}
                  type="button"
                  onClick={() => setSelectedCheck(check)}
                  className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-sky-50 border border-sky-300 text-sky-800 font-semibold shadow-2xs"
                      : "hover:bg-slate-50 border border-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {check.status === "pass" ? (
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-rose-500 shrink-0" />
                    )}
                    <span className="truncate">{check.rule}</span>
                  </div>

                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      check.status === "pass"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {check.points > 0 ? `+${check.points}` : check.points} pts
                  </span>
                </button>
              );
            })}
          </div>

          {/* Evidence Details */}
          <div className="space-y-2 flex-1 flex flex-col justify-between text-xs">
            <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
              <div className="text-slate-400 text-[10px] mb-1">{"// Parsed AST query expression:"}</div>
              <code className="text-sky-300">{selectedCheck.astToken}</code>
            </div>

            <div
              className={`p-2.5 rounded-lg border text-xs font-mono ${
                selectedCheck.status === "pass"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                  : "bg-rose-50/80 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Diagnostic Evidence:</span>
                <span className="text-[10px] uppercase font-bold">
                  {selectedCheck.status === "pass" ? "Verified" : "Action Required"}
                </span>
              </div>
              <p className="mt-1 text-[11px]">{selectedCheck.evidence}</p>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Passes to Step 03:</span>
              <span className="font-mono font-semibold text-emerald-600 flex items-center gap-1">
                Remediation Engine
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RubricAuditVisual;
