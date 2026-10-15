"use client";

import { Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import type { StepItem } from "../../types";

interface StepCardProps {
  step: StepItem;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export function StepCard({ step, index, isActive, onSelect }: StepCardProps) {
  const Icon = step.Icon;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Select step ${index + 1}: ${step.title}`}
      className={`group relative z-10 flex flex-col justify-between p-6 rounded-2xl border transition-all duration-200 cursor-pointer text-left outline-hidden focus-visible:ring-2 focus-visible:ring-[#005FD6] ${
        isActive
          ? "border-[#005FD6] bg-blue-50/20 shadow-md ring-1 ring-[#005FD6]/20"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Top Header: Step Number, Active Badge & Icon */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                isActive
                  ? "bg-[#005FD6] text-white border-[#005FD6]"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {step.stepNumber ?? `0${index + 1}`}
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {step.stepEyebrow}
            </span>
          </div>

          <div
            className={`size-10 ${step.iconClass} flex items-center justify-center rounded-xl border shadow-2xs transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon size={18} strokeWidth={2.2} />
          </div>
        </div>

        {/* Title & Badge */}
        <div className="mb-2">
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 mb-1.5">
            {step.badge}
          </span>
          <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-[#005FD6] transition-colors">
            {step.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-slate-600 font-light mb-4">
          {step.desc}
        </p>

        {/* Key Engineering Highlights */}
        {step.highlights && (
          <ul className="space-y-1.5 border-t border-slate-100 pt-3 mb-4">
            {step.highlights.map((highlight) => (
              <li
                key={highlight}
                className="flex items-start gap-2 text-xs text-slate-600 leading-snug"
              >
                <Check
                  size={13}
                  className="text-emerald-600 shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom Metric & Interaction Indicator */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span className="font-mono font-bold text-slate-900">
            {step.metricValue}
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold transition-colors ${
            isActive ? "text-[#005FD6]" : "text-slate-400 group-hover:text-slate-700"
          }`}
        >
          {isActive ? "Viewing Live" : "Inspect Step"}
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.div>
  );
}

export default StepCard;
