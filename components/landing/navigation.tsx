"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  Terminal,
} from "lucide-react";

const NAV_LINKS = [
  { name: "Cockpit", href: "#cockpit" },
  { name: "Architecture", href: "#blueprint" },
  { name: "100-Pt Rubric", href: "#rubric" },
  { name: "Shields Badge", href: "#badge-studio" },
  { name: "Remediation", href: "#remediation" },
  { name: "FAQ", href: "#faq" },
];

export function LandingNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#06080d]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Version Badge */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
          >
            <div className="flex size-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
              <ShieldCheck className="size-4.5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Repodoc
            </span>
          </Link>

          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-300 md:inline-flex">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v1.0 Rubric
          </span>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main Navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-xs font-medium tracking-wide text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden items-center gap-3 sm:flex">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Star</span>
            <span className="rounded bg-white/10 px-1 py-0.2 text-[10px] text-slate-400">
              1.4k
            </span>
          </a>

          <a
            href="#hero-command"
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition-all hover:bg-slate-200 active:scale-[0.98]"
          >
            <span>Run Audit</span>
            <ArrowRight className="size-3.5" />
          </a>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white lg:hidden"
        >
          {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#06080d]/95 px-4 pt-2 pb-6 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col space-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <a
                href="#hero-command"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-md bg-white py-2 text-xs font-semibold text-slate-950"
              >
                <Terminal className="size-3.5" />
                <span>Launch Audit Cockpit</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
