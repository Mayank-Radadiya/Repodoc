import type { FC } from "react";
import { FolderTree, ScanSearch, GitPullRequest } from "lucide-react";

const STEPS = [
  {
    Icon: FolderTree,
    title: "Traverse Tree in 1 Call",
    desc: "Single-call recursive Git tree traversal resolves structure in <1ms",
    badge: "GET /git/trees",
    iconClass: "bg-[#D6EAFF] text-[#005FD6] border-[#A9D3FF]",
  },
  {
    Icon: ScanSearch,
    title: "Defensible Rubric Audit",
    desc: "AST heading parsing & manifest checks across 5 core categories",
    badge: "100-pt Rubric",
    iconClass: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    Icon: GitPullRequest,
    title: "1-Click Atomic PR",
    desc: "Git Data API commits missing hygiene files in one reviewable PR",
    badge: "Atomic Commit",
    iconClass: "bg-emerald-100 text-emerald-600 border-emerald-200",
  },
];

export const Steps: FC = () => {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
          How It Works
        </span>
        <h2
          id="how-it-works-heading"
          className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Three steps. Zero vanity metrics.
        </h2>
        <p className="mt-3 text-base font-light text-slate-600">
          From inspecting the root tree to opening an atomic fix pull request.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-12 text-center md:grid-cols-3 md:gap-8">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="group relative z-10 border-neutral-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1"
          >
            {/* Dashed blueprint border accents */}
            <div className="pointer-events-none absolute top-0 -left-4 w-[calc(100%+2rem)] border border-dashed border-neutral-200" />
            <div className="pointer-events-none absolute -top-4 left-0 h-[calc(100%+2rem)] border border-dashed border-neutral-200" />
            <div className="pointer-events-none absolute -top-4 right-0 h-[calc(100%+2rem)] border border-dashed border-neutral-200" />
            <div className="pointer-events-none absolute bottom-0 -left-4 w-[calc(100%+2rem)] border border-dashed border-neutral-200" />

            <div
              className={`h-12 w-12 ${step.iconClass} mx-auto mb-4 flex items-center justify-center rounded-2xl border shadow-xs transition-transform duration-200 group-hover:scale-105`}
            >
              <step.Icon size={22} strokeWidth={2.2} />
            </div>

            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 mb-2">
              {step.badge}
            </span>

            <h3 className="font-display text-lg font-bold text-slate-900">
              {i + 1}. {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 font-light">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Steps;
