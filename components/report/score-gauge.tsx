"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { getBadgeColor } from "@/lib/badge";
import type { BadgeResponse } from "@/lib/types";

export type ScoreGaugeSize = "sm" | "md" | "lg" | number;

export interface BadgeColorDefinition {
  /** Hex color string used for SVG circle stroke and Canvas/CSS accents. */
  hex: string;
  /** Primary stroke color. */
  stroke: string;
  /** Tailwind text color class. */
  text: string;
  /** Tailwind background color class. */
  bg: string;
  /** Tailwind border color class. */
  border: string;
  /** Human-readable rating summary label (e.g. "Excellent", "Critical"). */
  label: string;
}

/**
 * Visual styling and metadata for each Shields.io badge threshold.
 */
export const BADGE_COLOR_PALETTE: Record<
  BadgeResponse["color"],
  BadgeColorDefinition
> = {
  brightgreen: {
    hex: "#10b981",
    stroke: "#10b981",
    text: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    label: "Excellent",
  },
  green: {
    hex: "#22c55e",
    stroke: "#22c55e",
    text: "text-green-500 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
    label: "Good",
  },
  yellow: {
    hex: "#eab308",
    stroke: "#eab308",
    text: "text-yellow-500 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-200 dark:border-yellow-800",
    label: "Fair",
  },
  orange: {
    hex: "#f97316",
    stroke: "#f97316",
    text: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200 dark:border-orange-800",
    label: "Needs Improvement",
  },
  red: {
    hex: "#ef4444",
    stroke: "#ef4444",
    text: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    label: "Critical",
  },
};

/**
 * Normalizes any score input into an integer clamped within [0, 100].
 * Non-finite numbers, NaN, null, and undefined resolve safely to 0.
 */
export function normalizeScore(rawScore: unknown): number {
  if (
    typeof rawScore !== "number" ||
    !Number.isFinite(rawScore) ||
    Number.isNaN(rawScore)
  ) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

/**
 * Returns the palette definition for a given score.
 */
export function getScoreGaugePalette(score: number): {
  color: BadgeResponse["color"];
  palette: BadgeColorDefinition;
} {
  const normalized = normalizeScore(score);
  const color = getBadgeColor(normalized);
  return { color, palette: BADGE_COLOR_PALETTE[color] };
}

export interface ScoreGaugeProps {
  /**
   * Health score from 0 to 100.
   */
  score?: number;
  /**
   * Alias for `score` (matching `AuditReport.healthScore`).
   */
  healthScore?: number;
  /**
   * Preset diameter size ("sm", "md", "lg") or explicit numeric pixel size. Defaults to "md".
   */
  size?: ScoreGaugeSize;
  /**
   * Custom stroke width for the SVG track and indicator.
   * If omitted, a balanced width is computed from the gauge size.
   */
  strokeWidth?: number;
  /**
   * Whether to animate the progress ring on mount. Defaults to true.
   * Will automatically be disabled if the user prefers reduced motion.
   */
  animated?: boolean;
  /**
   * Whether to display the "/ 100" max score denominator. Defaults to true.
   */
  showMaxScore?: boolean;
  /**
   * Whether to display the status descriptor label (e.g. "Excellent", "Critical"). Defaults to false.
   */
  showStatus?: boolean;
  /**
   * Optional custom label text to display below the score.
   */
  label?: string;
  /**
   * Optional custom CSS class name for the outer container.
   */
  className?: string;
  /**
   * Accessible label for screen readers. Defaults to "Repository health score: {score} out of 100".
   */
  "aria-label"?: string;
  /**
   * Optional test ID for testing frameworks. Defaults to "score-gauge".
   */
  "data-testid"?: string;
}

const SIZE_CONFIGS = {
  sm: {
    containerClass: "size-20",
    dimension: 80,
    defaultStrokeWidth: 6,
    scoreTextClass: "text-xl",
    maxScoreTextClass: "text-[9px]",
    statusTextClass: "text-[8px]",
  },
  md: {
    containerClass: "size-32",
    dimension: 128,
    defaultStrokeWidth: 8,
    scoreTextClass: "text-3xl",
    maxScoreTextClass: "text-xs",
    statusTextClass: "text-[10px]",
  },
  lg: {
    containerClass: "size-44",
    dimension: 176,
    defaultStrokeWidth: 10,
    scoreTextClass: "text-5xl",
    maxScoreTextClass: "text-sm",
    statusTextClass: "text-xs",
  },
} as const;

export function ScoreGauge({
  score,
  healthScore,
  size = "md",
  strokeWidth,
  animated = true,
  showMaxScore = true,
  showStatus = false,
  label,
  className,
  "aria-label": customAriaLabel,
  "data-testid": testId = "score-gauge",
}: ScoreGaugeProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  // Keep initial SVG markup independent of browser media queries for hydration.
  const shouldAnimate = animated && !reduceMotion;

  const rawScore = score ?? healthScore ?? 0;
  const normalizedScore = normalizeScore(rawScore);
  const { color: badgeColor, palette } = getScoreGaugePalette(normalizedScore);

  // Determine dimensions based on size prop
  const isPresetSize = typeof size === "string" && size in SIZE_CONFIGS;
  const presetConfig = isPresetSize
    ? SIZE_CONFIGS[size as keyof typeof SIZE_CONFIGS]
    : SIZE_CONFIGS.md;

  const pixelDimension = typeof size === "number" ? size : presetConfig.dimension;
  const activeStrokeWidth = strokeWidth ?? presetConfig.defaultStrokeWidth;

  // SVG Geometry
  // Fixed viewBox: 120 x 120, Center: (60, 60), Radius: 50
  const viewBoxSize = 120;
  const center = viewBoxSize / 2;
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159
  const targetOffset = circumference * (1 - normalizedScore / 100);

  const ariaLabel =
    customAriaLabel ??
    `Repository health score: ${normalizedScore} out of 100 (${palette.label})`;

  const statusDisplayText = label ?? (showStatus ? palette.label : null);

  const customStyle: React.CSSProperties =
    typeof size === "number"
      ? { width: `${pixelDimension}px`, height: `${pixelDimension}px` }
      : {};

  return (
    <div
      role="meter"
      aria-valuenow={normalizedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      data-testid={testId}
      data-score={normalizedScore}
      data-badge-color={badgeColor}
      data-color={badgeColor}
      style={customStyle}
      className={cn(
        "relative flex items-center justify-center shrink-0 select-none",
        isPresetSize ? presetConfig.containerClass : undefined,
        className,
      )}
    >
      {/* Radial SVG Gauge */}
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="size-full -rotate-90 overflow-visible"
        aria-hidden="true"
      >
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={activeStrokeWidth}
          className="text-slate-200 dark:text-neutral-800"
          data-slot="gauge-track"
        />

        {/* Dynamic score progress indicator */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={palette.hex}
          strokeWidth={activeStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          data-slot="gauge-indicator"
          data-badge-color={badgeColor}
          initial={
            animated
              ? { strokeDashoffset: circumference }
              : { strokeDashoffset: targetOffset }
          }
          animate={{ strokeDashoffset: targetOffset }}
          transition={{
            duration: shouldAnimate ? 0.75 : 0,
            ease: "easeOut",
          }}
        />
      </svg>

      {/* Central Score readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-1">
        <span
          data-testid="score-value"
          className={cn(
            "font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-none",
            presetConfig.scoreTextClass,
          )}
        >
          {normalizedScore}
        </span>

        {showMaxScore && (
          <span
            data-testid="score-max"
            className={cn(
              "font-mono font-medium text-slate-400 dark:text-neutral-500 uppercase tracking-widest mt-0.5 leading-none",
              presetConfig.maxScoreTextClass,
            )}
          >
            / 100
          </span>
        )}

        {statusDisplayText && (
          <span
            data-testid="score-status"
            className={cn(
              "font-sans font-semibold uppercase tracking-wider mt-1 truncate max-w-full px-1 leading-tight",
              presetConfig.statusTextClass,
              palette.text,
            )}
          >
            {statusDisplayText}
          </span>
        )}
      </div>
    </div>
  );
}
