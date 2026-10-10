"use client";

import { useState } from "react";
import {
  GitPullRequest,
  Check,
} from "lucide-react";

const LICENSES = [
  { id: "MIT", name: "MIT License", desc: "Permissive, simple, universally recognized." },
  { id: "Apache-2.0", name: "Apache 2.0", desc: "Permissive with express patent grant protection." },
  { id: "BSD-3-Clause", name: "BSD 3-Clause", desc: "Permissive with endorsement protection." },
];

const ECOSYSTEMS = [
  { id: "nodejs", name: "Node.js", gitignore: "node_modules, .env, dist/", ci: "actions/setup-node@v4 (npm test)" },
  { id: "rust", name: "Rust", gitignore: "target/, Cargo.lock, **/*.rs.bk", ci: "actions-rs/toolchain (cargo test)" },
  { id: "python", name: "Python", gitignore: "__pycache__/, *.pyc, .venv/", ci: "actions/setup-python@v5 (pytest)" },
  { id: "go", name: "Go", gitignore: "*.exe, bin/, vendor/", ci: "actions/setup-go@v5 (go test ./...)" },
];

export function RemediationStudio() {
  const [selectedLicense, setSelectedLicense] = useState("MIT");
  const [selectedEcosystem, setSelectedEcosystem] = useState("nodejs");
  const [isSimulating, setIsSimulating] = useState(false);
  const [prCreated, setPrCreated] = useState(false);

  const currentEcosystem = ECOSYSTEMS.find((e) => e.id === selectedEcosystem)!;

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setPrCreated(true);
    }, 700);
  };

  const payloadPreview = `{
  "base_tree": "4fa2b109e4c",
  "tree": [
    { "path": "LICENSE", "mode": "100644", "type": "blob", "sha": "e69de29bb2d" },
    { "path": ".gitignore", "mode": "100644", "type": "blob", "sha": "7f8b91a2c3d" },
    { "path": ".github/workflows/ci.yml", "mode": "100644", "type": "blob", "sha": "3a4b5c6d7e8" }
  ]
}`;

  return (
    <section id="remediation" className="relative scroll-mt-24 py-16 lg:py-24 border-t border-white/8 bg-[#070a10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-mono text-xs font-medium text-amber-300">
            <GitPullRequest className="size-3.5" />
            <span>Atomic Git Data API</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            1-Click Atomic PR Remediation Studio
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base leading-relaxed">
            Never overwrite existing files. Customize your open-source license and language runtime, then bundle all fixes into a single clean commit.
          </p>
        </div>

        {/* ── Remediation Workbench Card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Maintainer Choice Controls */}
            <div className="space-y-6">
              {/* License Choice */}
              <div>
                <label className="block font-mono text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. Select Open-Source License (Maintainer Legal Choice)
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {LICENSES.map((lic) => {
                    const isSelected = selectedLicense === lic.id;
                    return (
                      <button
                        key={lic.id}
                        type="button"
                        onClick={() => setSelectedLicense(lic.id)}
                        className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-500/10 text-white shadow-[0_0_12px_rgba(245,158,11,0.12)]"
                            : "border-white/8 bg-black/30 text-slate-400 hover:border-white/16 hover:text-slate-200"
                        }`}
                      >
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {lic.id}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          {lic.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ecosystem Runtime */}
              <div>
                <label className="block font-mono text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  2. Select Language &amp; Toolchain (.gitignore &amp; CI)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ECOSYSTEMS.map((eco) => {
                    const isSelected = selectedEcosystem === eco.id;
                    return (
                      <button
                        key={eco.id}
                        type="button"
                        onClick={() => setSelectedEcosystem(eco.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 font-mono text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-sky-500/60 bg-sky-500/10 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.12)]"
                            : "border-white/8 bg-black/30 text-slate-400 hover:border-white/16 hover:text-slate-200"
                        }`}
                      >
                        <span>{eco.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary of What Gets Generated */}
              <div className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-2">
                <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Remediation Summary
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0" />
                    <span>LICENSE: Full text for {selectedLicense}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0" />
                    <span>.gitignore: {currentEcosystem.gitignore}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-400 shrink-0" />
                    <span>CI Workflow: {currentEcosystem.ci}</span>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-semibold text-slate-950 shadow-md transition-all hover:bg-slate-200 active:scale-[0.99] disabled:opacity-75 sm:text-sm font-mono"
              >
                {isSimulating ? (
                  <>
                    <span className="size-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>Constructing Multi-File Tree...</span>
                  </>
                ) : prCreated ? (
                  <>
                    <Check className="size-4 text-emerald-600" />
                    <span>PR Opened: branch repodoc/health-remediation</span>
                  </>
                ) : (
                  <>
                    <GitPullRequest className="size-4" />
                    <span>Simulate 1-Click Atomic PR</span>
                  </>
                )}
              </button>
            </div>

            {/* Right: Low-level Git Data API Tree Payload */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/8 bg-black/40 p-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span className="text-amber-300">POST /git/trees (Atomic Payload)</span>
                  <span className="text-slate-500">Low-Level Git API</span>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                  <code>{payloadPreview}</code>
                </pre>
              </div>

              <div className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-2">
                <span className="font-mono text-xs font-semibold text-slate-300">
                  Idempotent Branching Architecture
                </span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Repodoc pushes to <code className="text-sky-300">repodoc/health-remediation</code>. Re-running the fix updates the existing branch rather than polluting your repository with multiple conflicting pull requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
