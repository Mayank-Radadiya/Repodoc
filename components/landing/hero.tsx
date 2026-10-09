"use client";

import { useState } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Sparkles,
  ChevronRight,
  ShieldCheck,
  GitPullRequest,
  Award,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { CandyLink } from "./candy-button";

const AUDIT_MODES = [
  { id: "audit", label: "100-Pt Audit", Icon: ShieldCheck },
  { id: "badge", label: "Shields Badge", Icon: Award },
  { id: "pr", label: "Atomic PR", Icon: GitPullRequest },
] as const;

const SAMPLE_REPOS = [
  "github.com/facebook/react",
  "github.com/astral-sh/uv",
  "github.com/shadcn-ui/ui",
  "github.com/sample/atlas-cli",
];

export function Hero() {
  const [selectedMode, setSelectedMode] = useState<string>("audit");
  const [repoInput, setRepoInput] = useState<string>(SAMPLE_REPOS[3]);
  const [isAuditing, setIsAuditing] = useState(false);
  const reduceMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const radius = useTransform(scrollY, [0, 260], [0, 32]);
  const inset = useTransform(scrollY, [0, 260], [0, 14]);

  const frameStyle = reduceMotion
    ? undefined
    : {
        borderBottomLeftRadius: radius,
        borderBottomRightRadius: radius,
        marginLeft: inset,
        marginRight: inset,
      };

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
    <main id="hero">
      {/* Full-bleed photo panel */}
      <motion.section
        style={frameStyle}
        className="relative isolate flex min-h-[96svh] flex-col justify-center overflow-hidden pt-36 pb-36 lg:pt-44 lg:pb-44"
      >
        <Image
          src="/landing/repository-landscape.png"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center [filter:saturate(1.45)_contrast(1.14)_brightness(1.06)]"
        />

        {/* Scrims for contrast */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_45%_at_50%_30%,rgba(3,17,48,0.30)_0%,rgba(3,17,48,0.10)_55%,transparent_80%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b from-slate-950/30 via-slate-950/8 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          {/* Eyebrow pill */}
          <a
            href="#how-it-works"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/15 py-2 pr-2.5 pl-3 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 sm:gap-3 sm:pr-3 sm:pl-4 sm:text-sm"
          >
            <Sparkles size={15} className="shrink-0 text-sky-200" />
            <span className="h-4 w-px shrink-0 bg-white/30" />
            <span className="truncate">
              Single-roundtrip Git tree traversal — 100-point defensible audit
            </span>
            <ChevronRight size={15} className="shrink-0 opacity-70" />
          </a>

          {/* Headline in Space Grotesk */}
          <h1 className="font-display mx-auto mt-8 max-w-4xl text-[2rem] leading-[1.12] font-normal tracking-[-0.03em] text-white [text-shadow:0_1px_2px_rgba(3,17,48,0.7),0_3px_18px_rgba(3,17,48,0.55)] sm:mt-10 sm:text-5xl lg:text-[4.25rem]">
            From git clone to defensible audit in seconds.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base font-light text-slate-100/90 [text-shadow:0_1px_4px_rgba(3,17,48,0.7)] sm:text-lg">
            No vanity word counts. Parse markdown ASTs, verify required hygiene,
            embed dynamic shields.io health badges, and fix gaps in one reviewable PR.
          </p>

          {/* Prompt card */}
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

          {/* Quick trust metrics */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/80 [text-shadow:0_1px_2px_rgba(3,17,48,0.6)] sm:gap-8 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-300" />
              Single-roundtrip Git tree traversal
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-300" />
              Defensible v1.0 Rubric
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-300" />
              1-Click Atomic PR via Git Data API
            </span>
          </div>
        </div>
      </motion.section>
    </main>
  );
}

export default Hero;
