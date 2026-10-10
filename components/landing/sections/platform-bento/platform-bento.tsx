import {
  FileCode2,
  CheckCircle2,
  FileCheck,
  GitPullRequest,
  Check,
  Layers,
} from "lucide-react";
import { RubricCard, AuditStreamCard } from "./bento-cards";
import { LineSvg, StraightLine, PulseBorderIcon } from "./bento-circuits";

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
          <RubricCard />

          {/* Card 2: Live Git Tree Audit Stream */}
          <AuditStreamCard />

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
