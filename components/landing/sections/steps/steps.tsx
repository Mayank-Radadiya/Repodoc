"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { STEPS } from "../../data/steps";
import { StepController } from "./step-controller";
import { WorkbenchCanvas } from "./workbench-canvas";
import { StepCard } from "./step-card";

export function Steps() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const containerRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Handle manual selection
  const handleSelectStep = (index: number) => {
    setActiveStep(index);
    setProgressPercent(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
    setProgressPercent(0);
  };

  // Auto-play timer cycle (every 6 seconds if playing and not hovered)
  useEffect(() => {
    if (!isPlaying || isHovered || shouldReduceMotion) return;

    const intervalTime = 100; // update progress every 100ms
    const totalDuration = 6000; // 6s per step
    const increment = (intervalTime / totalDuration) * 100;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setActiveStep((curr) => (curr + 1) % STEPS.length);
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered, shouldReduceMotion]);

  // GSAP entrance animation with context cleanup
  useEffect(() => {
    if (!containerRef.current || shouldReduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.from(".steps-header-elem", {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
      });

      gsap.from(".steps-workbench-elem", {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.2,
        ease: "power2.out",
      });

      gsap.from(".steps-card-elem", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.35,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [shouldReduceMotion]);

  return (
    <section
      ref={containerRef}
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
    >
      {/* Section Header */}
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <span className="steps-header-elem inline-block font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 mb-2">
          Pipeline Architecture // How It Works
        </span>
        <h2
          id="how-it-works-heading"
          className="steps-header-elem font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Three surgical operations. Zero guesswork.
        </h2>
        <p className="steps-header-elem mt-3 text-base font-light text-slate-600 sm:text-lg">
          From a single-roundtrip recursive Git tree traversal to an atomic multi-file
          remediation pull request in seconds.
        </p>
      </div>

      {/* Interactive Step Controller & Progress Tabs */}
      <div className="steps-workbench-elem">
        <StepController
          activeStep={activeStep}
          onSelectStep={handleSelectStep}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          progressPercent={progressPercent}
        />

        {/* Live Interactive Developer Workbench */}
        <WorkbenchCanvas
          activeStep={activeStep}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      </div>

      {/* Animated Flow Connecting Rail (Desktop) */}
      <div className="hidden lg:flex items-center justify-between px-16 mb-4 -mt-4 text-xs font-mono text-slate-400 select-none">
        <span className="flex items-center gap-2 text-[#005FD6] font-semibold">
          <span className="size-2 rounded-full bg-[#005FD6] animate-pulse" />
          Reconnaissance Stage
        </span>
        <div className="flex-1 mx-6 h-px bg-linear-to-r from-[#005FD6]/30 via-sky-400/30 to-emerald-500/30 border-t border-dashed border-slate-300" />
        <span className="flex items-center gap-2 text-sky-700 font-semibold">
          <span className="size-2 rounded-full bg-sky-500" />
          Deterministic Evaluation
        </span>
        <div className="flex-1 mx-6 h-px bg-linear-to-r from-sky-400/30 via-emerald-400/30 to-emerald-500/30 border-t border-dashed border-slate-300" />
        <span className="flex items-center gap-2 text-emerald-700 font-semibold">
          <span className="size-2 rounded-full bg-emerald-500" />
          Atomic PR Execution
        </span>
      </div>

      {/* 3 Step Detail Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((step, idx) => (
          <div key={step.title} className="steps-card-elem">
            <StepCard
              step={step}
              index={idx}
              isActive={activeStep === idx}
              onSelect={() => handleSelectStep(idx)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default Steps;
