"use client";

import { ShieldCheck, GitBranch } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Interactive Observatory", href: "#observatory" },
  { label: "Scoring Rubric v1.0", href: "#rubric" },
  { label: "Platform Bento", href: "#features" },
  { label: "Fix Playground", href: "#fix-playground" },
];

const RESOURCE_LINKS = [
  { label: "GitHub Repository", href: "https://github.com/Mayank-Radadiya/Repodoc" },
  { label: "Shields.io Documentation", href: "https://shields.io/badges/endpoint-badge" },
  { label: "SPDX License List", href: "https://spdx.org/licenses/" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-slate-50/60 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 pb-14 md:grid-cols-12 lg:gap-16">
          {/* Brand Column (6 cols) */}
          <div className="flex flex-col gap-4 md:col-span-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#005FD6] to-[#209BFF] text-white shadow-xs">
                <ShieldCheck size={18} strokeWidth={2.4} />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                RepoLens
              </span>
            </div>

            <p className="max-w-sm text-sm font-light leading-relaxed text-slate-600">
              The defensible repository governance platform. 100-point audits,
              transparent AST evidence, dynamic Shields.io badges, and 1-click atomic PR remediation.
            </p>

            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-xs text-slate-600 shadow-2xs">
                <GitBranch size={12} className="text-[#005FD6]" />
                Rubric v1.0 Standard
              </span>
            </div>
          </div>

          {/* Product Links (3 cols) */}
          <div className="md:col-span-3">
            <h4 className="mb-4 font-mono text-xs font-semibold tracking-wider text-slate-900 uppercase">
              Product
            </h4>
            <ul className="space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm font-light text-slate-600 transition-colors hover:text-[#005FD6]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & Open Source (3 cols) */}
          <div className="md:col-span-3">
            <h4 className="mb-4 font-mono text-xs font-semibold tracking-wider text-slate-900 uppercase">
              Standards & Git
            </h4>
            <ul className="space-y-3">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-light text-slate-600 transition-colors hover:text-[#005FD6]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-8 sm:flex-row">
          <p className="text-xs text-slate-500 font-light">
            © 2026 RepoLens. Built for engineers who care about defensible standards.
          </p>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/Mayank-Radadiya/Repodoc"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="GitHub Repository"
            >
              <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
