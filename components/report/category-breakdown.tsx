"use client";

import { useId, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FilePlus2,
  X,
  XCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuditReport, CategoryId, CheckResult } from "@/src/lib/types";
import { REPORT_CATEGORIES, REPORT_CATEGORY_IDS } from "./categories";
import {
  formatPoints,
  getPotentialPoints,
  type ReportPreview,
} from "./report-preview";

export interface CategoryBreakdownProps {
  report: AuditReport;
  preview: ReportPreview;
  previewedIds: ReadonlySet<string>;
  onTogglePreview: (checkId: string) => void;
  openCategories: CategoryId[];
  onOpenCategoriesChange: (categories: CategoryId[]) => void;
  className?: string;
}

type CheckFilter = "all" | "failed" | "passed";

interface CheckRowProps {
  check: CheckResult;
  owner: string;
  repo: string;
  defaultBranch: string;
  isPreviewed: boolean;
  onTogglePreview: (checkId: string) => void;
}

function CheckRow({
  check,
  owner,
  repo,
  defaultBranch,
  isPreviewed,
  onTogglePreview,
}: CheckRowProps) {
  const potential = getPotentialPoints(check);
  const showPreviewToggle = isPreviewed || (!check.passed && potential > 0);
  const StatusIcon = check.passed ? CheckCircle2 : XCircle;
  const statusLabel = isPreviewed
    ? "Previewed"
    : check.passed
      ? "Passed"
      : "Failed";
  const remediation = check.remediation;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <StatusIcon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            isPreviewed
              ? "text-info-foreground"
              : check.passed
                ? "text-success-foreground"
                : "text-destructive-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 break-words font-medium text-foreground">
              {check.name}
            </p>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {formatPoints(check.pointsAwarded)}/{check.maxPoints} pts
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium",
                isPreviewed
                  ? "border-info/40 bg-info/10 text-info-foreground"
                  : check.passed
                    ? "border-success/40 bg-success/10 text-success-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive-foreground",
              )}
            >
              {statusLabel}
            </span>
          </div>
          <Collapsible className="mt-2">
            <CollapsibleTrigger
              aria-label={`Evidence and remediation for ${check.name}`}
              className="group flex cursor-pointer items-center gap-1.5 rounded-sm py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Evidence &amp; remediation
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none"
              />
            </CollapsibleTrigger>
            <CollapsiblePanel className="motion-reduce:transition-none">
              <div className="mt-2 space-y-3 border-l-2 border-border pl-3 text-xs leading-relaxed">
                <p className="max-w-prose whitespace-pre-wrap break-words text-muted-foreground">
                  {check.evidence.details.trim()
                    ? check.evidence.details
                    : "No evidence details available"}
                </p>
                <p className="text-muted-foreground">
                  Evidence: {check.evidence.found ? "Found" : "Not found"}
                </p>
                <div>
                  <p className="font-medium text-foreground">Files checked</p>
                  {check.evidence.filesChecked.length > 0 ? (
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {check.evidence.filesChecked.map((path, index) => (
                        <li key={`${index}-${path}`}>
                          <code className="whitespace-pre-wrap break-all">
                            {path}
                          </code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No files checked</p>
                  )}
                </div>
                {remediation && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <p className="font-medium text-foreground">How to fix</p>
                    <p className="mt-1 text-muted-foreground">
                      {remediation.description}
                    </p>
                    <p className="mt-2">
                      <code className="rounded-sm bg-muted px-1.5 py-0.5 break-all">
                        {remediation.targetPath}
                      </code>
                    </p>
                    {remediation.canAutomate && (
                      <a
                        href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/new/${encodeURIComponent(defaultBranch)}?filename=${encodeURIComponent(remediation.targetPath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-info-foreground underline-offset-4 hover:underline"
                      >
                        <FilePlus2 aria-hidden="true" className="size-3.5" />
                        Create {remediation.targetPath} on GitHub
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>
        {showPreviewToggle && (
          <button
            type="button"
            aria-pressed={isPreviewed}
            aria-label={
              isPreviewed
                ? `Remove preview for ${check.name}`
                : `Preview fix for ${check.name}: +${formatPoints(potential)} pts`
            }
            onClick={() => onTogglePreview(check.id)}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isPreviewed
                ? "border-info/50 bg-info/15 text-info-foreground"
                : "border-border bg-background text-muted-foreground hover:border-info/50 hover:text-info-foreground",
            )}
          >
            {isPreviewed
              ? "Undo preview"
              : `Preview +${formatPoints(potential)} pts`}
          </button>
        )}
      </div>
    </li>
  );
}

export function CategoryBreakdown({
  report,
  preview,
  previewedIds,
  onTogglePreview,
  openCategories,
  onOpenCategoriesChange,
  className,
}: CategoryBreakdownProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<CheckFilter>("all");
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const counts = useMemo(() => {
    let passed = 0;
    for (const check of preview.checks) {
      if (check.passed) passed += 1;
    }
    return {
      total: preview.checks.length,
      passed,
      failed: preview.checks.length - passed,
    };
  }, [preview.checks]);

  const filters: { value: CheckFilter; count: number }[] = [
    { value: "all", count: counts.total },
    { value: "failed", count: counts.failed },
    { value: "passed", count: counts.passed },
  ];
  const filterLabels: Record<CheckFilter, string> = {
    all: "All checks",
    failed: "Failed",
    passed: "Passed",
  };

  const matches = (check: CheckResult) => {
    if (filter === "failed" && check.passed) return false;
    if (filter === "passed" && !check.passed) return false;
    if (query && !check.name.toLowerCase().includes(query)) return false;
    return true;
  };

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="font-display text-xl font-semibold text-foreground"
          >
            Category breakdown
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Open a category to check the evidence. Preview fixes on failed
            checks to see the score impact.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs text-muted-foreground">
          {REPORT_CATEGORIES.length} pillars · {report.checks.length} checks
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter checks by status"
          className="flex items-center gap-1.5"
        >
          {filters.map(({ value, count }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {filterLabels[value]} ({count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenCategoriesChange([...REPORT_CATEGORY_IDS])}
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenCategoriesChange([])}
          >
            Collapse all
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          type="search"
          aria-label="Search checks"
          placeholder="Search checks"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm flex-1"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch("")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>

      <Accordion
        multiple
        value={openCategories}
        onValueChange={(value) =>
          onOpenCategoriesChange(value as CategoryId[])
        }
        className="mt-4 border-y border-border [&_[data-slot=accordion-panel]]:motion-reduce:transition-none [&_[data-slot=accordion-indicator]]:motion-reduce:transition-none"
      >
        {REPORT_CATEGORIES.map(({ id, name, icon: CategoryIcon }) => {
          const category = preview.categories[id];
          const categoryPassed = category.checks.filter(
            (check) => check.passed,
          ).length;
          const visibleChecks = category.checks.filter(matches);
          const percent =
            category.maxPoints > 0
              ? Math.round((category.pointsAwarded / category.maxPoints) * 100)
              : 0;

          return (
            <AccordionItem key={id} value={id} id={`category-${id}`}>
              <AccordionTrigger
                aria-label={`${name}: ${formatPoints(category.pointsAwarded)} out of ${category.maxPoints} points`}
                className="items-center gap-3 py-4 text-foreground"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                    <CategoryIcon
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {categoryPassed} of {category.checks.length} passed
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-foreground/70"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatPoints(category.pointsAwarded)}/{category.maxPoints}{" "}
                    pts
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                {category.checks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No checks available
                  </p>
                ) : visibleChecks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No checks match the current filter.
                  </p>
                ) : (
                  <ul
                    aria-label={`${name} checks`}
                    className="divide-y divide-border"
                  >
                    {visibleChecks.map((check) => (
                      <CheckRow
                        key={check.id}
                        check={check}
                        owner={report.owner}
                        repo={report.repo}
                        defaultBranch={report.defaultBranch}
                        isPreviewed={previewedIds.has(check.id)}
                        onTogglePreview={onTogglePreview}
                      />
                    ))}
                  </ul>
                )}
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
