export const REPORT_THEME_COOKIE = "repodoc-theme";

export type ReportTheme = "light" | "dark";

/**
 * Normalizes a persisted theme cookie value. Unknown or missing values
 * fall back to the light theme.
 */
export function parseReportTheme(value?: string | null): ReportTheme {
  return value?.trim().toLowerCase() === "dark" ? "dark" : "light";
}
