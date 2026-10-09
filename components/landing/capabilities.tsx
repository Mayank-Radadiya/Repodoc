"use client";

import { useState } from "react";
import {
  FolderTree,
  GitPullRequest,
  Zap,
  Award,
  Scale,
  GitBranch,
} from "lucide-react";

interface Capability {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  badge: string;
  iconClass: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: FolderTree,
    title: "Single-Call Tree Traversal",
    desc: "Resolves 90%+ repository presence checks in a single recursive tree call (GET /git/trees). Executes in-memory lookups in <1ms without N+1 network churn.",
    badge: "1 API Call",
    iconClass: "bg-[#EAF4FF] text-[#005FD6]",
  },
  {
    icon: GitPullRequest,
    title: "Git Data API Orchestration",
    desc: "Constructs atomic multi-file fixes directly via Git Blobs, Trees, and Commits. Opens a single clean PR from an idempotent branch without checkout churn.",
    badge: "Low-Level API",
    iconClass: "bg-[#EAF4FF] text-[#209BFF]",
  },
  {
    icon: Zap,
    title: "HTTP 304 ETag Resiliency",
    desc: "Leverages conditional requests (If-None-Match). Re-auditing unchanged repositories returns 304 Not Modified, consuming zero GitHub rate-limit quota.",
    badge: "0 Quota Hit",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Award,
    title: "Shields.io Dynamic Endpoint",
    desc: "Serves standard Shields.io endpoint JSON directly (/api/badge/[owner]/[repo]), eliminating fragile serverless SVG/canvas rendering bottlenecks.",
    badge: "Schema v1",
    iconClass: "bg-amber-50 text-amber-600",
  },
  {
    icon: Scale,
    title: "Legal-Safe License Prompting",
    desc: "Choosing an open-source license is a legal decision. The engine identifies missing licenses and prompts maintainers for explicit SPDX selection.",
    badge: "SPDX Compliant",
    iconClass: "bg-rose-50 text-rose-600",
  },
  {
    icon: GitBranch,
    title: "Idempotent Branch Remediation",
    desc: "All automated remediations target repodoc/health-remediation. Subsequent audits cleanly fast-forward the branch rather than spamming duplicate PRs.",
    badge: "Safe Fast-Forward",
    iconClass: "bg-violet-50 text-violet-600",
  },
];

export function Capabilities() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="capabilities" className="py-16 sm:py-24 lg:py-28 bg-slate-50/50 border-t border-slate-200/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
            Deep-Tech Capabilities
          </span>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything the Engine Does
          </h2>
          <p className="mt-3 text-base font-light text-slate-600 sm:text-lg">
            Built from low-level Git primitives to ensure mathematical defensibility,
            rate-limit endurance, and clean repository hygiene.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap, idx) => (
            <div
              key={cap.title}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative bg-white p-8 border border-slate-200/80 rounded-2xl shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              {/* Dashed blueprint border lines */}
              <div className="pointer-events-none absolute top-2 -left-1 w-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute -top-1 left-2 h-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute -top-1 right-2 h-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />
              <div className="pointer-events-none absolute bottom-2 -left-1 w-[calc(100%+0.5rem)] border border-dashed border-neutral-200" />

              <div className="flex items-center justify-between mb-6">
                <div
                  className={`h-12 w-12 ${cap.iconClass} flex items-center justify-center rounded-xl transition-transform duration-200 ${
                    hoveredIndex === idx ? "scale-110" : ""
                  }`}
                >
                  <cap.icon size={22} strokeWidth={2.2} />
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  {cap.badge}
                </span>
              </div>

              <h3 className="mb-2 text-base font-bold tracking-[0.03em] text-slate-900">
                {cap.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 font-light">
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Capabilities;
