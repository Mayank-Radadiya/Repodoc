import { BADGE_COLORS } from "@/lib/constants";
import type { BadgeResponse } from "@/lib/types";

export const BADGE_LABEL = "repo health";
export const BADGE_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";

/**
 * Determines the Shields.io badge color based on health score.
 * Thresholds:
 * - score >= 90: "brightgreen"
 * - score >= 75: "green"
 * - score >= 60: "yellow"
 * - score >= 40: "orange"
 * - score < 40:  "red"
 */
export function getBadgeColor(score: number): BadgeResponse["color"] {
  if (score >= 90) return BADGE_COLORS[90];
  if (score >= 75) return BADGE_COLORS[75];
  if (score >= 60) return BADGE_COLORS[60];
  if (score >= 40) return BADGE_COLORS[40];
  return BADGE_COLORS[0];
}

/**
 * Constructs a Shields.io endpoint compliant response for a health score.
 */
export function formatBadgeResponse(score: number): BadgeResponse {
  const normalizedScore = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;

  return {
    schemaVersion: 1,
    label: BADGE_LABEL,
    message: `${normalizedScore}/100`,
    color: getBadgeColor(normalizedScore),
  };
}

export interface BadgeErrorResponse extends BadgeResponse {
  isError: true;
}

/**
 * Constructs an error badge response for Shields.io.
 */
export function formatBadgeError(message: string): BadgeErrorResponse {
  return {
    schemaVersion: 1,
    isError: true,
    label: BADGE_LABEL,
    message: message || "error",
    color: "red",
  };
}
