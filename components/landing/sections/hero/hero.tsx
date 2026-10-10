"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import GridDistortion from "@/components/GridDistortion";
import { HeroPromptCard } from "./hero-prompt-card";
import { TRUST_METRICS } from "../../data/hero";

export function Hero() {
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

  return (
    <div id="hero">
      {/* Full-bleed photo panel */}
      <motion.section
        style={frameStyle}
        className="relative isolate flex min-h-[96svh] flex-col justify-center overflow-hidden pt-36 pb-36 lg:pt-44 lg:pb-44"
      >
        {/* Interactive WebGL Grid Distortion background */}
        <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
          <GridDistortion
            imageSrc="https://assets.watermelon.sh/bg-hero-39.avif"
            grid={16}
            radius={0.2}
            strength={0.16}
            relaxation={0.96}
            mode="drag"
            softness={0.12}
            chroma={0.06}
            idle={0.25}
            clickRipple={true}
            intro={true}
            className="w-full h-full filter-[saturate(1.45)_contrast(1.14)_brightness(1.06)]"
          />
        </div>

        <Image
          src="https://assets.watermelon.sh/bg-hero-39.avif"
          alt=""
          aria-hidden="true"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="-z-30 object-cover object-center filter-[saturate(1.45)_contrast(1.14)_brightness(1.06)]"
        />

        {/* Scrims for contrast */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_45%_at_50%_30%,rgba(3,17,48,0.30)_0%,rgba(3,17,48,0.10)_55%,transparent_80%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-linear-to-b from-slate-950/30 via-slate-950/8 to-transparent" />

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
            embed dynamic shields.io health badges, and fix gaps in one
            reviewable PR.
          </p>

          {/* Prompt card */}
          <HeroPromptCard />

          {/* Quick trust metrics */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-white/80 [text-shadow:0_1px_2px_rgba(3,17,48,0.6)] sm:gap-8 sm:text-sm">
            {TRUST_METRICS.map((metric) => (
              <span key={metric} className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-300" />
                {metric}
              </span>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

export default Hero;
