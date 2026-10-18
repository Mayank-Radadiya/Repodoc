"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuditReport, CategoryId, CheckResult } from "@/lib/types";
import { REPORT_CATEGORIES, REPORT_CATEGORY_IDS } from "./categories";
import { formatPoints, getPotentialPoints, type ReportPreview } from "./report-preview";
import { CheckRow } from "./check-row";
import styles from "./report.module.css";

export interface CategoryBreakdownProps {
  report: AuditReport;
  preview: ReportPreview;
  previewedIds: ReadonlySet<string>;
  onTogglePreview: (checkId: string) => void;
  openCategories: CategoryId[];
  onOpenCategoriesChange: (categories: CategoryId[]) => void;
  className?: string;
  search?: string;
  onSearchChange?: (search: string) => void;
  filter?: CheckFilter;
  onFilterChange?: (filter: CheckFilter) => void;
}

export type CheckFilter = "all" | "failed" | "passed";
type CheckSort = "rubric" | "impact" | "name";

export function CategoryBreakdown({
  report,
  preview,
  previewedIds,
  onTogglePreview,
  openCategories,
  onOpenCategoriesChange,
  className,
  search: controlledSearch,
  onSearchChange,
  filter: controlledFilter,
  onFilterChange,
}: CategoryBreakdownProps) {
  const headingId = useId();
  const sortId = useId();
  const [localFilter, setLocalFilter] = useState<CheckFilter>("all");
  const [localSearch, setLocalSearch] = useState("");
  const [sort, setSort] = useState<CheckSort>("impact");
  const filter = controlledFilter ?? localFilter;
  const search = controlledSearch ?? localSearch;
  const setFilter = onFilterChange ?? setLocalFilter;
  const setSearch = onSearchChange ?? setLocalSearch;
  const query = search.trim().toLowerCase();
  const isFiltering = filter !== "all" || query.length > 0;

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
    if (
      query &&
      ![
        check.name,
        check.evidence.details,
        ...check.evidence.filesChecked,
        check.remediation?.targetPath ?? "",
        REPORT_CATEGORIES.find((category) => category.id === check.category)
          ?.name ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    )
      return false;
    return true;
  };
  const matchingCount = preview.checks.filter(matches).length;
  const visibleCategories = REPORT_CATEGORIES.filter(
    ({ id }) => !isFiltering || preview.categories[id].checks.some(matches),
  );
  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };
  const revealMatches = () => onOpenCategoriesChange([...REPORT_CATEGORY_IDS]);

  return (
    <section
      id="report-findings"
      aria-labelledby={headingId}
      className={cn(styles.findings, className)}
    >
      <div className={styles.findingsHeading}>
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-sm leading-6 font-semibold text-foreground"
          >
            Findings
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">
            Explore the evidence behind each check and preview improvements.
          </p>
        </div>
        <span className="text-xs leading-5 tabular-nums text-muted-foreground">
          {report.checks.length} checks across {REPORT_CATEGORIES.length}{" "}
          categories
        </span>
      </div>

      <div className={styles.findingsToolbar}>
        <div
          role="group"
          aria-label="Filter checks by status"
          className={styles.statusFilters}
        >
          {filters.map(({ value, count }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                revealMatches();
              }}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-medium transition-colors sm:flex-none",
                filter === value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filterLabels[value]} ({count})
            </button>
          ))}
        </div>

        <div className={styles.toolbarControls}>
          <div className={styles.findingsSearch}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 z-10 size-4 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search checks"
              placeholder="Search checks or files…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                revealMatches();
              }}
              className="w-full flex-1 [&_input]:pr-11 [&_input]:pl-9"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-0 z-10 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <ArrowUpDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <label htmlFor={sortId} className="sr-only">
              Sort checks within categories
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) => setSort(event.target.value as CheckSort)}
              className={styles.sortSelect}
            >
              <option value="impact">Highest impact</option>
              <option value="rubric">Rubric order</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          <div className={styles.viewActions}>
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
      </div>
      {isFiltering && (
        <div className="flex items-center justify-between gap-3 px-5 pb-3 text-xs text-muted-foreground sm:px-6">
          <p role="status" aria-live="polite">
            {matchingCount} of {counts.total} checks shown
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-11 rounded-md px-2 font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {matchingCount === 0 ? (
        <div className={styles.emptyState}>
          <Search
            aria-hidden="true"
            className="mx-auto mb-3 size-6 text-muted-foreground"
          />
          <h3 className="text-sm font-semibold">
            {counts.total === 0
              ? "No checks in this report"
              : "No checks match your filters"}
          </h3>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {counts.total === 0
              ? "Run another audit to generate repository findings."
              : "Try a different check name or file path, or clear your filters."}
          </p>
          {isFiltering && (
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="mt-4"
            >
              Show all checks
            </Button>
          )}
        </div>
      ) : (
        <Accordion
          multiple
          value={openCategories}
          onValueChange={(value) =>
            onOpenCategoriesChange(value as CategoryId[])
          }
          className="border-t border-border [&_[data-slot=accordion-panel]]:motion-reduce:transition-none [&_[data-slot=accordion-indicator]]:motion-reduce:transition-none"
        >
          {visibleCategories.map(({ id, name, icon: CategoryIcon }) => {
            const category = preview.categories[id];
            const categoryPassed = category.checks.filter(
              (check) => check.passed,
            ).length;
            const visibleChecks = category.checks
              .filter(matches)
              .sort((a, b) =>
                sort === "impact"
                  ? getPotentialPoints(b) - getPotentialPoints(a)
                  : sort === "name"
                    ? a.name.localeCompare(b.name)
                    : 0,
              );

            return (
              <AccordionItem
                key={id}
                value={id}
                id={`category-${id}`}
                className={styles.categoryItem}
              >
                <AccordionTrigger
                  aria-label={`${name}: ${formatPoints(category.pointsAwarded)} out of ${category.maxPoints} points`}
                  className={cn(
                    styles.categoryTrigger,
                    "items-center gap-3 px-4 py-4 text-foreground hover:bg-muted/60 sm:px-6",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                      <CategoryIcon
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                          {name}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {categoryPassed} of {category.checks.length} passed
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatPoints(category.pointsAwarded)}/
                      {category.maxPoints} pts
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionPanel className="px-4 pb-0 sm:px-6">
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
      )}
    </section>
  );
}
