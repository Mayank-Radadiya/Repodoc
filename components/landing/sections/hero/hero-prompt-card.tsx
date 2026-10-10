"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CandyLink } from "../../ui/candy-button";
import { AUDIT_MODES, SAMPLE_REPOS } from "../../data/hero";

export function HeroPromptCard() {
  const [selectedMode, setSelectedMode] = useState<string>("audit");
  const [repoInput, setRepoInput] = useState<string>(SAMPLE_REPOS[3]);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleSimulateAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      const el = document.getElementById("observatory");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 600);
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-2xl rounded-[22px] bg-white/25 p-1 shadow-[var(--shadow-overlay)] ring-1 ring-white/40 backdrop-blur-md sm:mt-12">
      <div className="rounded-[18px] bg-slate-950/90 p-4 text-left select-none sm:p-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <span className="font-mono text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Target GitHub Repository
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
            <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
            API ready
          </span>
        </div>

        {/* Repo input field */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            className="w-full bg-transparent font-mono text-sm text-white placeholder-slate-500 focus:outline-none sm:text-base"
            placeholder="github.com/owner/repository"
          />
        </div>

        {/* Mode selectors & CTA */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-800/60 pt-4">
          <div className="flex items-center gap-1 rounded-full bg-white/[0.06] p-1">
            {AUDIT_MODES.map(({ id, label, Icon }) => {
              const isActive = selectedMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedMode(id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-white/15 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <CandyLink
              href="#observatory"
              onClick={handleSimulateAudit}
              className="w-full gap-2 px-5 py-2 text-sm sm:w-auto"
            >
              {isAuditing ? "Auditing Tree…" : "Run Audit"}
              <ArrowRight size={15} className="shrink-0" />
            </CandyLink>
          </div>
        </div>
      </div>
    </div>
  );
}
