"use client";

import { useId } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { calculateCategoryScores } from "@/src/lib/scoring/engine";
import type { AuditReport, CategoryId, CheckResult } from "@/src/lib/types";

export interface CategoryBreakdownProps {
  report: AuditReport;
  className?: string;
}

const CATEGORIES = [
  { id: "documentation", name: "Documentation" },
  { id: "hygiene", name: "Project Hygiene" },
  { id: "testing_ci", name: "Testing & CI/CD" },
  { id: "community", name: "Community & Metadata" },
  { id: "security", name: "Security Baseline" },
] as const satisfies readonly { id: CategoryId; name: string }[];

function CheckRow({ check }: { check: CheckResult }) {
  const StatusIcon = check.passed ? CheckCircle2 : XCircle;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <StatusIcon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            check.passed ? "text-success-foreground" : "text-destructive-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="min-w-0 break-words font-medium text-foreground">
              {check.name}
            </p>
            <span className="shrink-0 tabular-nums text-foreground">
              {check.pointsAwarded}/{check.maxPoints} points
            </span>
          </div>
          <p
            className={cn(
              "mt-1 text-xs",
              check.passed ? "text-success-foreground" : "text-destructive-foreground",
            )}
          >
            {check.passed ? "Passed" : "Failed"}
          </p>
          <Collapsible className="mt-2">
            <CollapsibleTrigger
              aria-label={`Evidence for ${check.name}`}
              className="group flex cursor-pointer items-center gap-1.5 rounded-sm py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Evidence
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
                          <code className="whitespace-pre-wrap break-all">{path}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted-foreground">No files checked</p>
                  )}
                </div>
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>
      </div>
    </li>
  );
}

export function CategoryBreakdown({ report, className }: CategoryBreakdownProps) {
  const headingId = useId();
  const categoryScores = calculateCategoryScores(report.checks);

  return (
    <section aria-labelledby={headingId} className={cn("min-w-0", className)}>
      <h2 id={headingId} className="font-display text-xl font-semibold text-foreground">
        Category breakdown
      </h2>
      <Accordion
        multiple
        defaultValue={["documentation"]}
        className="mt-4 border-y border-border [&_[data-slot=accordion-panel]]:motion-reduce:transition-none [&_[data-slot=accordion-indicator]]:motion-reduce:transition-none"
      >
        {CATEGORIES.map(({ id, name }) => {
          const category = categoryScores[id];

          return (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger
                aria-label={`${name}: ${category.pointsAwarded} out of ${category.maxPoints} points`}
                className="items-center gap-3 py-5 text-foreground"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0 break-words">{name}</span>
                  <span
                    className="shrink-0 tabular-nums text-muted-foreground"
                  >
                    {category.pointsAwarded}/{category.maxPoints}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                {category.checks.length > 0 ? (
                  <ul aria-label={`${name} checks`} className="divide-y divide-border">
                    {category.checks.map((check) => (
                      <CheckRow key={check.id} check={check} />
                    ))}
                  </ul>
                ) : (
                  <p>No checks available</p>
                )}
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
