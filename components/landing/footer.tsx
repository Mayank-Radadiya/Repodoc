"use client";

import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#040609] py-14 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand & Systems Status */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="flex size-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="size-4" />
              </div>
              <span className="font-display text-base font-bold tracking-tight text-white">
                Repodoc
              </span>
            </div>

            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Repository intelligence, defensible health auditing, and 1-click atomic PR remediation powered by low-level Git Data APIs.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                API: Operational
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-400">
                Rubric v1.0
              </span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
              Product
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#cockpit" className="hover:text-white transition-colors">
                  Audit Cockpit
                </a>
              </li>
              <li>
                <a href="#blueprint" className="hover:text-white transition-colors">
                  Git Tree Engine
                </a>
              </li>
              <li>
                <a href="#rubric" className="hover:text-white transition-colors">
                  100-Point Rubric
                </a>
              </li>
              <li>
                <a href="#badge-studio" className="hover:text-white transition-colors">
                  Shields.io Badge API
                </a>
              </li>
              <li>
                <a href="#remediation" className="hover:text-white transition-colors">
                  Atomic Remediation
                </a>
              </li>
            </ul>
          </div>

          {/* Engineering Column */}
          <div className="space-y-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
              Specifications
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-300 font-mono">/api/badge/:owner/:repo</span>
              </li>
              <li>
                <span className="text-slate-300 font-mono">schemaVersion: 1</span>
              </li>
              <li>
                <span className="text-slate-300 font-mono">ETag 304 Caching</span>
              </li>
              <li>
                <span className="text-slate-300 font-mono">POST /git/blobs</span>
              </li>
              <li>
                <span className="text-slate-300 font-mono">POST /git/trees</span>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
              Open Source
            </span>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <span className="text-slate-400">License: MIT</span>
              </li>
              <li>
                <span className="text-slate-400">Zero data retention</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/6 pt-6 text-xs text-slate-500 sm:flex-row">
          <span>&copy; 2026 Repodoc. Defensible engineering standards for repositories.</span>
          <span className="mt-2 sm:mt-0 font-mono text-[11px]">
            Single-roundtrip Git tree traversal engine
          </span>
        </div>
      </div>
    </footer>
  );
}
