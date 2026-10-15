"use client";

import { useRef } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "motion/react";
import { STEPS } from "../../data/steps";

interface StepControllerProps {
  activeStep: number;
  onSelectStep: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  progressPercent: number;
}

export function StepController({
  activeStep,
  onSelectStep,
  isPlaying,
  onTogglePlay,
  progressPercent,
}: StepControllerProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard navigation across tabs (ArrowLeft, ArrowRight, Home, End)
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % STEPS.length;
      onSelectStep(next);
      tabsRef.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + STEPS.length) % STEPS.length;
      onSelectStep(prev);
      tabsRef.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      onSelectStep(0);
      tabsRef.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      onSelectStep(STEPS.length - 1);
      tabsRef.current[STEPS.length - 1]?.focus();
    }
  };

  return (
    <div className="relative mb-8">
      {/* Container for step buttons + auto-play control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        {/* Step Tab Buttons */}
        <div
          role="tablist"
          aria-label="How Repodoc works workflow steps"
          className="relative grid grid-cols-3 gap-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 max-w-2xl"
        >
          {STEPS.map((step, idx) => {
            const isActive = activeStep === idx;

            return (
              <button
                key={step.title}
                ref={(el) => {
                  tabsRef.current[idx] = el;
                }}
                role="tab"
                id={`step-tab-${idx}`}
                aria-selected={isActive}
                aria-controls={`step-panel-${idx}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelectStep(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`relative z-10 flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-[#005FD6] ${
                  isActive ? "text-slate-900 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {/* Active Sliding Background Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-step-tab-pill"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 35,
                    }}
                    className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/60 z-[-1]"
                  />
                )}

                <div
                  className={`size-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-mono font-bold ${
                    isActive
                      ? "bg-[#005FD6] text-white shadow-2xs"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step.stepNumber ?? `0${idx + 1}`}
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight truncate">
                  <span className="truncate">{step.title}</span>
                  <span className="font-mono text-[10px] text-slate-600 font-normal truncate">
                    {step.badge}
                  </span>
                </div>

                {/* Mobile Short Label */}
                <span className="sm:hidden font-mono text-[11px]">
                  {step.method ?? `Step ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Auto-cycle Tour Control */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause automated workflow tour" : "Start automated workflow tour"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#005FD6]"
          >
            {isPlaying ? (
              <>
                <Pause size={12} className="text-[#005FD6] fill-[#005FD6]" />
                <span className="text-[11px]">Tour Playing</span>
              </>
            ) : (
              <>
                <Play size={12} className="text-slate-500 fill-slate-500" />
                <span className="text-[11px]">Play Tour</span>
              </>
            )}
          </button>

          {/* Progress bar indication of auto-play */}
          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
            <motion.div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-[#005FD6] rounded-full transition-all duration-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepController;
