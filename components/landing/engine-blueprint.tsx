"use client";

import { Cpu } from "lucide-react";

const BLUEPRINT_STEPS = [
  {
    step: "01",
    tag: "Single-Roundtrip Traversal",
    title: "GET /git/trees/{sha}?recursive=1",
    desc: "Bypasses slow recursive crawls by fetching the entire repository tree in a single payload. Resolves 90%+ of file existence queries in memory in <1ms.",
    badge: "<1ms in-memory set lookups",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    code: `// Single GitHub API Tree Call
const tree = await github.getGitTree(owner, repo, sha, { recursive: 1 });
const pathSet = new Set(tree.map(node => node.path));
// Lookups are O(1) set operations
const hasLicense = pathSet.has("LICENSE");`,
  },
  {
    step: "02",
    tag: "Context-Aware AST Heading Engine",
    title: "Structural Heading Tokens",
    desc: "Replaces naive word count proxies with markdown AST parsing. Automatically recognizes whether a repo is a library, CLI, or web application from package manifests.",
    badge: "Adapts to Libraries vs Apps",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    code: `// Markdown AST Heading Extraction
const ast = remark().parse(readmeContent);
const headings = extractHeadings(ast);
// Validates structural intent, not line fluff
const hasSetup = headings.some(h => /install|setup/i.test(h.text));`,
  },
  {
    step: "03",
    tag: "Low-Level Git Data API",
    title: "Atomic Multi-File Commits",
    desc: "Constructs clean, idempotent pull requests directly from raw Git objects (blobs, trees, commits). No multiple noisy commits; hygiene files land in one commit.",
    badge: "1 Commit • 1 PR • Zero Conflicts",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    code: `// Atomic Git Tree Assembly
const blobSha = await github.createBlob(owner, repo, fileContent);
const newTree = await github.createTree(owner, repo, [{ path, sha: blobSha }]);
const commit = await github.createCommit(owner, repo, newTree.sha);
await github.createPullRequest(owner, repo, commit.sha);`,
  },
];

export function EngineBlueprint() {
  return (
    <section id="blueprint" className="relative scroll-mt-24 py-16 lg:py-24 border-t border-white/8 bg-[#06080d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs font-medium text-slate-300">
            <Cpu className="size-3.5 text-sky-400" />
            <span>Under The Hood</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Architected for Precision, Speed &amp; Low Latency
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base leading-relaxed">
            Repodoc is built from ground-up systems engineering principles, not superficial prompt wrappers.
          </p>
        </div>

        {/* 3-Step Architectural Grid with Dashed Crosshairs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {BLUEPRINT_STEPS.map((step) => (
            <div
              key={step.step}
              className="relative flex flex-col justify-between rounded-2xl border border-dashed border-white/12 bg-[#0a0f18]/80 p-6 transition-all hover:border-white/25 hover:bg-[#0c1320]"
            >
              {/* Step indicator header */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    PHASE {step.step}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium ${step.badgeColor}`}
                  >
                    {step.badge}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-400">
                    {step.tag}
                  </span>
                  <h3 className="font-display mt-1 text-base font-bold text-white sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed sm:text-sm">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Code Preview Terminal */}
              <div className="mt-6 rounded-xl border border-white/8 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
                <pre>
                  <code>{step.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
