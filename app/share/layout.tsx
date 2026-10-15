import type { ReactNode } from "react";
import { ReportShell } from "@/components/report/report-shell";

export default function ShareLayout({ children }: { children: ReactNode }) {
  return <ReportShell>{children}</ReportShell>;
}
