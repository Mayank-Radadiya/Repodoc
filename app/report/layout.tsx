import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ReportShell } from "@/components/report/report-shell";
import {
  REPORT_THEME_COOKIE,
  parseReportTheme,
} from "@/components/report/theme";
import { ReportThemeScope } from "@/components/report/theme-scope";

// Reads the theme cookie at request time; allow this route to block on the server.
export const instant = false;

export default async function ReportLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = parseReportTheme(cookieStore.get(REPORT_THEME_COOKIE)?.value);

  return (
    <ReportThemeScope initialTheme={theme}>
      <ReportShell>{children}</ReportShell>
    </ReportThemeScope>
  );
}
