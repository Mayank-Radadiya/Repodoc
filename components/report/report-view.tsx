import { GitBranch, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { AuditReport } from "@/src/lib/types";
import { ScoreGauge } from "./score-gauge";
import { CategoryBreakdown } from "./category-breakdown";
import { BadgeSnippet } from "./badge-snippet";
import styles from "./report.module.css";

export interface ReportViewProps {
  report: AuditReport;
  baseUrl: string | null;
  actions?: ReactNode;
  feedback?: ReactNode;
}

export function ReportView({
  report,
  baseUrl,
  actions,
  feedback,
}: ReportViewProps) {
  const passed = report.checks.filter((check) => check.passed).length;
  const date = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(report.generatedAt));

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">
            {report.owner}/{report.repo}
          </h1>
          <p className={`${styles.secondary} mt-2 text-base`}>
            Repository health report
          </p>
          <dl
            className={`${styles.secondary} mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <dt className="flex items-center gap-1.5">
                <GitBranch aria-hidden="true" className="size-4" />
                Branch
              </dt>
              <dd className="font-medium [overflow-wrap:anywhere]">
                {report.defaultBranch}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Audited</dt>
              <dd>
                <time dateTime={report.generatedAt}>{date}</time>
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>Rubric</dt>
              <dd>{report.rubricVersion}</dd>
            </div>
          </dl>
          <a
            href={`https://github.com/${encodeURIComponent(report.owner)}/${encodeURIComponent(report.repo)}`}
            className={`${styles.link} mt-3 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium`}
          >
            View on GitHub{" "}
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      {feedback}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:grid-rows-[min-content_1fr]">
        <section
          aria-labelledby="health-score-heading"
          className={`${styles.surface} p-6 lg:col-start-3 lg:row-start-1`}
        >
          <h2
            id="health-score-heading"
            className="font-display text-xl font-semibold"
          >
            Repository health
          </h2>
          <div className="mt-6 flex flex-col items-center gap-5 pb-2">
            <ScoreGauge
              healthScore={report.healthScore}
              size="lg"
              showStatus={false}
            />
            <p className="text-base font-medium">
              {passed} of {report.checks.length} checks passed
            </p>
          </div>
          <p className={`${styles.secondary} mt-4 text-sm leading-relaxed`}>
            Based on repository files and metadata. Tests and workflows are
            inspected for presence, not executed.
          </p>
        </section>
        <div
          className={`${styles.surface} p-5 sm:p-7 lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1`}
        >
          <CategoryBreakdown report={report} className="[&_button]:min-h-11" />
        </div>
        <div className="min-w-0 lg:col-start-3 lg:row-start-2">
          {baseUrl ? (
            <BadgeSnippet
              report={report}
              baseUrl={baseUrl}
              className="[&_button]:min-h-11"
            />
          ) : (
            <div className={`${styles.surface} min-h-64 p-6`} aria-busy="true">
              <h2 className="font-display text-xl font-semibold">
                Embed your badge
              </h2>
              <p className={`${styles.secondary} mt-3 text-sm`}>
                Preparing badge links…
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
