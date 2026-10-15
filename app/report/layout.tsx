import type { ReactNode } from "react";
import { ReportShell } from "@/components/report/report-shell";

export default function ReportLayout({ children }: { children: ReactNode }) {
  return <ReportShell>{children}</ReportShell>;
}
