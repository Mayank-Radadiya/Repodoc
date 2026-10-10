"use client";

import { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  ArrowRight,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { ReflectShader } from "@/components/originkit/ui/reflect-shader";
import { SAMPLE_REPOS_PROFILES } from "./sample-report";
import { RepoAuditProfile } from "./types";

interface HeroProps {
  selectedRepo?: RepoAuditProfile;
  onSelectRepo?: (repo: RepoAuditProfile) => void;
}

export function Hero({
  selectedRepo: controlledRepo,
  onSelectRepo,
}: HeroProps = {}) {
  const [internalRepo, setInternalRepo] = useState<RepoAuditProfile>(
    SAMPLE_REPOS_PROFILES[0]
  );
  const selectedRepo = controlledRepo || internalRepo;
  const [customUrl, setCustomUrl] = useState(selectedRepo.fullName);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleSelect = (repo: RepoAuditProfile) => {
    setInternalRepo(repo);
    onSelectRepo?.(repo);
    setCustomUrl(repo.fullName);
  };

  const handleAuditClick = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      const el = document.getElementById("cockpit");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 450);
  };

  return (
    <section className="relative isolate min-h-[92svh] flex flex-col justify-center overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* ── WebGL Reflect Shader Canvas Background ── */}
      <div className="absolute inset-0 -z-30 overflow-hidden pointer-events-auto">
        <ReflectShader
          background="#06080d"
          tint="#38bdf8"
          speed={32}
          brightness={75}
          thickness={16}
          chromatic={8}
          bandGap={22}
          zoom={310}
          hover={85}
          className="h-full w-full"
        />
      </div>

      {/* ── Scrim overlays for text legibility & atmosphere ── */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_50%_40%,rgba(6,8,13,0.55)_0%,rgba(6,8,13,0.88)_70%,#06080d_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-36 bg-gradient-to-b from-[#06080d] via-[#06080d]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-[#06080d] via-[#06080d]/60 to-transparent" />

      {/* ── Hero Content Container ── */}
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 py-1.5 pr-3 pl-3.5 text-xs font-medium text-slate-200 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/10 sm:gap-2.5 sm:text-sm">
          <Sparkles className="size-3.5 text-sky-400 shrink-0" />
          <span className="h-3.5 w-px bg-white/20 shrink-0" />
          <span className="truncate">
            Single-roundtrip Git tree traversal • Defensible Rubric v1.0
          </span>
          <ChevronRight className="size-3.5 text-slate-400 shrink-0" />
        </div>

        {/* Display Headline */}
        <h1 className="font-display mx-auto mt-7 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-[4rem] lg:leading-[1.1]">
          From public URL to defensible audit in seconds.
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed font-normal text-slate-300 sm:text-lg">
          No vanity word counts. Parse markdown ASTs, verify required hygiene,
          embed dynamic shields.io health badges, and fix gaps in one reviewable PR.
        </p>

        {/* ── Interactive Command Bar ── */}
        <div id="hero-command" className="mx-auto mt-10 w-full max-w-2xl">
          <div className="rounded-2xl border border-white/14 bg-[#0b0f17]/90 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl ring-1 ring-white/5 sm:p-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Terminal URL Input */}
              <div className="relative flex flex-1 items-center rounded-xl border border-white/8 bg-black/40 px-3.5 py-2.5">
                <Terminal className="size-4 text-slate-400 shrink-0 mr-2.5" />
                <span className="font-mono text-xs text-slate-500 select-none mr-1 hidden sm:inline">
                  https://
                </span>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="github.com/owner/repository"
                  className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none sm:text-sm"
                  aria-label="GitHub repository address"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleAuditClick}
                disabled={isAuditing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-md transition-all hover:bg-slate-200 active:scale-[0.98] disabled:opacity-75 sm:text-sm"
              >
                {isAuditing ? (
                  <>
                    <span className="size-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                    <span>Auditing Tree...</span>
                  </>
                ) : (
                  <>
                    <span>Run Audit</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick-select Repository Chips */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/6 px-1.5 pt-3">
              <span className="font-mono text-[11px] font-medium text-slate-400 select-none">
                Sample audits:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SAMPLE_REPOS_PROFILES.map((repo) => {
                  const isSelected = selectedRepo.id === repo.id;
                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleSelect(repo)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all ${
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                          : "border-white/8 bg-white/4 text-slate-400 hover:border-white/16 hover:bg-white/8 hover:text-slate-200"
                      }`}
                    >
                      <span className="truncate">{repo.fullName}</span>
                      <span
                        className={`rounded px-1 text-[10px] ${
                          repo.totalScore >= 90
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {repo.totalScore}/100
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Signals */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 sm:gap-8 sm:text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>&lt;1ms Git Tree set lookups</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Standard Shields.io API</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span>Zero-quota ETag caching</span>
          </div>
        </div>
      </div>
    </section>
  );
}
