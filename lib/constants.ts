import type { BadgeResponse } from "./types";

export const RUBRIC_VERSION = "1.0.0";

/**
 * Lower bounds for health scores from 0 to 100.
 * Select the greatest threshold that does not exceed the score.
 */
export const BADGE_COLORS = {
  90: "brightgreen",
  75: "green",
  60: "yellow",
  40: "orange",
  0: "red",
} as const satisfies Readonly<Record<number, BadgeResponse["color"]>>;

export const REPODOC_BRANCH = "repodoc/health-remediation";
