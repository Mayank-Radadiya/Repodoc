"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowDown, ChevronRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { HeroPromptCard } from "./hero-prompt-card";
import { TRUST_METRICS } from "../../data/hero";
import { SvgTextFilter } from "../../ui/svg-text-filter";
import styles from "./hero.module.css";

const HEADLINE_LINES = ["From git clone to", "defensible audit in seconds."];

export function Hero() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-hero-announcement]", { y: -8, opacity: 0, duration: 0.5 })
          .from("[data-hero-word]", {
            yPercent: 110,
            rotate: 3,
            opacity: 0,
            duration: 0.8,
            stagger: 0.035,
          }, 0.12)
          .from("[data-hero-description]", { y: 12, opacity: 0, duration: 0.65 }, 0.42)
          .from("[data-hero-composer]", {
            y: 24,
            scale: 0.98,
            opacity: 0,
            duration: 0.8,
            clearProps: "transform,opacity",
          }, 0.5)
          .from("[data-hero-trust]", {
            y: 8, opacity: 0, duration: 0.45, stagger: 0.06,
          }, 0.8)
          .from("[data-hero-explore]", { opacity: 0, duration: 0.5 }, 1);
      }, heroRef);

      return () => context.revert();
    });

    return () => media.revert();
  }, []);

  const { scrollY } = useScroll();
  const radius = useTransform(scrollY, [0, 260], [0, reduceMotion ? 0 : 32]);
  const inset = useTransform(scrollY, [0, 260], [0, reduceMotion ? 0 : 14]);

  // Keep the server and client style shape identical, including reduced motion.
  const frameStyle = {
    borderBottomLeftRadius: radius,
    borderBottomRightRadius: radius,
    marginLeft: inset,
    marginRight: inset,
  };

  return (
    <div id="hero">
      {/* Full-bleed photo panel */}
      <motion.section
        ref={heroRef}
        aria-labelledby="hero-heading"
        style={frameStyle}
        className={`${styles.hero} relative isolate flex min-h-[96svh] flex-col justify-center overflow-hidden px-0 pt-36 pb-24 sm:pt-40 lg:pt-44 lg:pb-32`}
      >
        {/* Scrims for contrast */}
        <div className={styles.scrim} />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-linear-to-b from-slate-950/30 via-slate-950/8 to-transparent" />

        <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div data-hero-announcement>
            <motion.a
              href="#how-it-works"
              tabIndex={0}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className={styles.announcement}
            >
              <ShieldCheck size={15} className="shrink-0 text-sky-200" aria-hidden="true" />
              <span>A clear picture of your repository’s health</span>
              <ChevronRight size={15} className="shrink-0 opacity-70" aria-hidden="true" />
            </motion.a>
          </div>

          <SvgTextFilter
            targetRef={headlineRef}
            filterId="dom-grid-distortion"
            maxScale={26}
            relaxation={0.92}
          />
          <h1
            ref={headlineRef}
            id="hero-heading"
            className={`${styles.headline} font-display`}
          >
            {HEADLINE_LINES.map((line, index) => (
              <span key={line} className="block">
                {index > 0 && " "}
                {line.split(" ").map((word, wordIndex) => (
                  <span key={`${word}-${wordIndex}`} className={styles.wordMask}>
                    <span data-hero-word className="inline-block origin-bottom-left">{word}</span>
                    {" "}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p data-hero-description className={styles.description}>
            Turn any public GitHub repository into a clear, 100-point health report.
            Find what’s missing. Fix it in one reviewable pull request.
          </p>

          {/* Prompt card */}
          <HeroPromptCard />

          {/* Quick trust metrics */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/90 [text-shadow:0_1px_4px_rgba(3,17,48,0.8)] sm:gap-x-8">
            {TRUST_METRICS.map((metric) => (
              <span data-hero-trust key={metric} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-200" aria-hidden="true" />
                {metric}
              </span>
            ))}
          </div>
          <a data-hero-explore href="#observatory" className={styles.explore}>
            See an audit in action
            <ArrowDown size={14} aria-hidden="true" />
          </a>
        </div>
      </motion.section>
    </div>
  );
}

export default Hero;
