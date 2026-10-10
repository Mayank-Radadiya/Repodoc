import { CheckCircle2, AlertCircle } from "lucide-react";

export interface FindingsListProps {
  fixed: boolean;
}

export function FindingsList({ fixed }: FindingsListProps) {
  return (
    <div className="mt-4 flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
      {/* Gaps / Remediations */}
      {!fixed && (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 flex items-start gap-3">
            <AlertCircle
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
            />
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
            <AlertCircle
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
            />
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
        <CheckCircle2
          size={16}
          className="text-emerald-600 shrink-0 mt-0.5"
        />
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
        <CheckCircle2
          size={16}
          className="text-emerald-600 shrink-0 mt-0.5"
        />
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
        <CheckCircle2
          size={16}
          className="text-emerald-600 shrink-0 mt-0.5"
        />
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
  );
}
