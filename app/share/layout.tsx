import type { ReactNode } from "react";
import { ReportShell } from "@/components/report/report-shell";
import { ReportThemeScope } from "@/components/report/theme-scope";

export default function ShareLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ReportThemeScope initialTheme="light">
      <ReportShell>{children}</ReportShell>
    </ReportThemeScope>
  );
}
