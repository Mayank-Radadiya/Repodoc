import { Scale, Activity, GitBranch } from "lucide-react";
import { RUBRIC_WEIGHTS, RECENT_AUDITS } from "../../data/bento";

export function RubricCard() {
  return (
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
          {RUBRIC_WEIGHTS.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200/60 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className={`flex size-2 rounded-full ${item.color}`} />
                <span className="text-xs font-medium text-slate-800">
                  {item.name}
                </span>
              </div>
              <span className={`font-mono text-xs font-bold ${item.text}`}>
                {item.points} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuditStreamCard() {
  return (
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
                <p className="font-mono text-xs font-bold text-slate-800">
                  {item.repo}
                </p>
                <p className="text-[11px] text-slate-500 font-light">
                  {item.note}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                {item.score}
              </span>
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
  );
}
