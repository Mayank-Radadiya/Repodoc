"use client";

import type { ReactNode } from "react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { useOptionalReportTheme } from "./theme-scope";

export function ReportShell({ children }: { children: ReactNode }) {
  const theme = useOptionalReportTheme();
  const scopeElement = theme?.scopeElement;

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:shadow-overlay"
      >
        Skip to report
      </a>
      <DashboardNavbar
        section="Report"
        navLabel="Report navigation"
        portalContainer={scopeElement}
      />
      <main
        id="report-content"
        className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {children}
      </main>
    </div>
  );
}
