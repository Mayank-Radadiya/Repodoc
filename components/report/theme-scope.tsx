"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import styles from "./report.module.css";
import {
  REPORT_THEME_COOKIE,
  parseReportTheme,
  type ReportTheme,
} from "./theme";

export { REPORT_THEME_COOKIE, parseReportTheme };
export type { ReportTheme };

export interface ReportThemeScopeProps {
  initialTheme?: ReportTheme;
  children: ReactNode;
}

interface ReportThemeContextValue {
  theme: ReportTheme;
  setTheme: (theme: ReportTheme) => void;
  toggleTheme: () => void;
  /**
   * The wrapper element that carries the dark class. Dialogs portal into
   * this element so their content stays inside the themed scope.
   */
  scopeElement: HTMLElement | null;
}

const ReportThemeContext = createContext<ReportThemeContextValue | null>(null);

export function useReportTheme(): ReportThemeContextValue {
  const value = useContext(ReportThemeContext);
  if (!value) {
    throw new Error("useReportTheme must be used within a ReportThemeScope.");
  }
  return value;
}

function persistTheme(theme: ReportTheme) {
  if (typeof document === "undefined") return;
  document.cookie = `${REPORT_THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Scopes the dark theme to the report and share pages. The landing page
 * stays light, so the class is applied on a wrapper element instead of
 * the document root.
 */
export function ReportThemeScope({
  initialTheme = "light",
  children,
}: ReportThemeScopeProps) {
  const [theme, setThemeState] = useState<ReportTheme>(initialTheme);
  const [scopeElement, setScopeElement] = useState<HTMLElement | null>(null);

  const setTheme = useCallback((next: ReportTheme) => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: ReportTheme = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, scopeElement }),
    [theme, setTheme, toggleTheme, scopeElement],
  );

  const isDark = theme === "dark";

  return (
    <ReportThemeContext.Provider value={value}>
      <div
        ref={setScopeElement}
        data-testid="report-theme-scope"
        data-theme={theme}
        style={{ colorScheme: theme }}
        className={cn(
          styles.scope,
          "min-h-svh bg-background text-foreground",
          isDark && "dark",
        )}
      >
        {children}
      </div>
    </ReportThemeContext.Provider>
  );
}
