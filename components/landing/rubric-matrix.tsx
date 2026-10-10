"use client";

import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Users,
  Lock,
  GitPullRequest,
  Check,
} from "lucide-react";
import { CategoryId } from "./types";
import { RUBRIC_CATEGORIES } from "./sample-report";

interface RubricDetailCheck {
  name: string;
  points: number;
  files: string;
  criteria: string;
  canAutomate: boolean;
}

const RUBRIC_BREAKDOWN: Record<CategoryId, RubricDetailCheck[]> = {
  documentation: [
    {
      name: "README.md Presence",
      points: 8,
      files: "README.md, README",
      criteria: "Root file existence verified via single git tree traversal.",
      canAutomate: false,
    },
    {
      name: "Essential Heading Tokens",
      points: 10,
      files: "README.md",
      criteria: "AST heading tokens: detects '# Installation' / 'Setup' and 'Usage' / 'Quickstart'.",
      canAutomate: false,
    },
    {
      name: "Architecture & Overview",
      points: 4,
      files: "README.md, docs/*",
      criteria: "High-level system architecture overview or design motivation section present.",
      canAutomate: false,
    },
    {
      name: "Contributing Guidelines",
      points: 3,
      files: "CONTRIBUTING.md",
      criteria: "Clear setup instructions and PR submission guidelines for contributors.",
      canAutomate: true,
    },
  ],
  hygiene: [
    {
      name: "Valid OSI Open Source License",
      points: 10,
      files: "LICENSE, LICENSE.md",
      criteria: "Recognized OSI open-source license text (MIT, Apache-2.0, BSD, GPL, etc.).",
      canAutomate: true,
    },
    {
      name: "Language-Appropriate .gitignore",
      points: 5,
      files: ".gitignore",
      criteria: "Detects package manifests (package.json, Cargo.toml) and validates ignore rules.",
      canAutomate: true,
    },
    {
      name: "Code of Conduct",
      points: 5,
      files: "CODE_OF_CONDUCT.md",
      criteria: "Industry-standard community participation guidelines (e.g. Contributor Covenant).",
      canAutomate: true,
    },
  ],
  testing_ci: [
    {
      name: "Automated CI/CD Workflow",
      points: 15,
      files: ".github/workflows/*.yml",
      criteria: "Automated test pipeline triggered on pull requests and branch pushes.",
      canAutomate: true,
    },
    {
      name: "Test Runner Script Configured",
      points: 10,
      files: "package.json, Cargo.toml, pytest.ini",
      criteria: "Manifest declares test runner execution scripts or dedicated test directory.",
      canAutomate: false,
    },
  ],
  community: [
    {
      name: "Issue & PR Templates",
      points: 8,
      files: ".github/ISSUE_TEMPLATE/*, .github/pull_request_template.md",
      criteria: "Standardized templates ensuring structured bug reports and feature requests.",
      canAutomate: true,
    },
    {
      name: "Repository Metadata & Topics",
      points: 7,
      files: "GitHub API repository metadata",
      criteria: "Descriptive repo summary, homepage URL, and relevant discoverability topics.",
      canAutomate: false,
    },
  ],
  security: [
    {
      name: "Security Disclosure Policy",
      points: 10,
      files: "SECURITY.md, .github/SECURITY.md",
      criteria: "Defines private vulnerability disclosure channels and contact information.",
      canAutomate: true,
    },
    {
      name: "Automated Dependency Scanning",
      points: 5,
      files: ".github/dependabot.yml, .renovaterc.json",
      criteria: "Active automated vulnerability scanner for third-party dependencies.",
      canAutomate: true,
    },
  ],
};

const CATEGORY_ICONS: Record<CategoryId, React.ComponentType<{ className?: string }>> = {
  documentation: FileText,
  hygiene: ShieldCheck,
  testing_ci: Workflow,
  community: Users,
  security: Lock,
};

export function RubricMatrix() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("documentation");

  const currentCategory = RUBRIC_CATEGORIES.find((c) => c.id === selectedCategory)!;
  const currentChecks = RUBRIC_BREAKDOWN[selectedCategory];

  return (
    <section id="rubric" className="relative scroll-mt-24 py-16 lg:py-24 border-t border-white/8 bg-[#070a10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-medium text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>Rubric Specification v1.0</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            100-Point Defensible Scoring Standards
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base leading-relaxed">
            Every point is awarded based on concrete file presence, AST tokens, and project-type context.
          </p>
        </div>

        {/* ── Category Tab Switcher ── */}
        <div className="flex flex-wrap items-center justify-center gap-2 pb-6">
          {RUBRIC_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_16px_rgba(34,197,94,0.12)]"
                    : "border-white/8 bg-[#0b1019] text-slate-400 hover:border-white/16 hover:text-slate-200"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{cat.label}</span>
                <span className="font-mono text-xs opacity-75">
                  ({cat.maxPoints} pts)
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Category Detail Card & Table ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 border-b border-white/8 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                {currentCategory.label}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentCategory.description}
              </p>
            </div>
            <div className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg shrink-0">
              Weight: {currentCategory.maxPoints} / 100 Points Total
            </div>
          </div>

          {/* Table of Checks */}
          <div className="space-y-3">
            {currentChecks.map((check, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-white/6 bg-black/30 p-4 transition-colors hover:border-white/12 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">
                      {check.name}
                    </span>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-slate-300 font-medium">
                      {check.points} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {check.criteria}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500">
                    Inspecting: <span className="text-slate-400">{check.files}</span>
                  </p>
                </div>

                <div className="shrink-0">
                  {check.canAutomate ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-medium text-amber-300">
                      <GitPullRequest className="size-3.5" />
                      <span>1-Click PR Fix</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                      <span>Manual / Maintainer</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
