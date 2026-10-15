"use client";

import { Lock, Terminal, Cpu } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { STEPS } from "../../data/steps";
import { TreeTraversalVisual } from "./tree-traversal-visual";
import { RubricAuditVisual } from "./rubric-audit-visual";
import { AtomicPrVisual } from "./atomic-pr-visual";

interface WorkbenchCanvasProps {
  activeStep: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function WorkbenchCanvas({
  activeStep,
  onMouseEnter,
  onMouseLeave,
}: WorkbenchCanvasProps) {
  const currentStep = STEPS[activeStep];
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden mb-12"
      role="region"
      aria-label="Interactive Repodoc Workflow Workbench"
    >
      {/* Window Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-100/80 px-4 py-3 select-none">
        {/* Left Window Buttons + Engine Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-500">
            <Cpu size={12} className="text-[#005FD6]" />
            <span>repodoc-engine // stage-{currentStep.stepNumber}</span>
          </div>
        </div>

        {/* Center: Endpoint Badge */}
        <div className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-mono text-xs text-slate-700 shadow-2xs border border-slate-200 max-w-[320px] truncate">
          <Lock size={10} className="text-slate-400 shrink-0" />
          <span className="truncate">{currentStep.endpoint}</span>
        </div>

        {/* Right: Latency & Mode */}
        <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
          <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">
            {currentStep.latencyBenchmark}
          </span>
        </div>
      </div>

      {/* Dynamic Content Panel */}
      <div
        role="tabpanel"
        id={`step-panel-${activeStep}`}
        aria-labelledby={`step-tab-${activeStep}`}
        tabIndex={0}
        className="p-4 sm:p-6 lg:p-7 min-h-[460px] flex flex-col focus-visible:outline-hidden"
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeStep}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col"
          >
            {activeStep === 0 && <TreeTraversalVisual />}
            {activeStep === 1 && <RubricAuditVisual />}
            {activeStep === 2 && <AtomicPrVisual />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Bottom Footer Bar */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs text-slate-500 font-mono">
        <span className="flex items-center gap-1.5 text-[11px]">
          <Terminal size={12} className="text-[#005FD6]" />
          Zero clone requirement · Fully deterministic execution
        </span>
        <span className="text-[11px] font-semibold text-slate-600">
          Step {activeStep + 1} of {STEPS.length}
        </span>
      </div>
    </div>
  );
}

export default WorkbenchCanvas;
