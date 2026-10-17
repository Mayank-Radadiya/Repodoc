"use client";

import { cn } from "@/lib/utils";
import type { CategoryId } from "@/src/lib/types";
import { REPORT_CATEGORIES } from "./categories";
import { formatPoints, type ReportPreview } from "./report-preview";

export type PillarTone = "success" | "warning" | "danger";

export function getPillarTone(pointsAwarded: number, maxPoints: number): PillarTone {
  const ratio = maxPoints > 0 ? pointsAwarded / maxPoints : 0;
  if (ratio >= 0.75) return "success";
  if (ratio >= 0.25) return "warning";
  return "danger";
}

const TONE_CLASSES: Record<
  PillarTone,
  { text: string; bar: string }
> = {
  success: {
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  warning: {
    text: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  danger: {
    text: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
};

export interface CategoryPillarStripProps {
  preview: ReportPreview;
  onSelectCategory: (category: CategoryId) => void;
  className?: string;
}

export function CategoryPillarStrip({
  preview,
  onSelectCategory,
  className,
}: CategoryPillarStripProps) {
  return (
    <ul
      aria-label="Score by rubric category"
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5", className)}
    >
      {REPORT_CATEGORIES.map(({ id, name, icon: Icon }) => {
        const category = preview.categories[id];
        const percent =
          category.maxPoints > 0
            ? Math.round((category.pointsAwarded / category.maxPoints) * 100)
            : 0;
        const tone = getPillarTone(category.pointsAwarded, category.maxPoints);
        const toneClasses = TONE_CLASSES[tone];

        return (
          <li key={id} className="min-w-0">
            <button
              type="button"
              data-category={id}
              data-tone={tone}
              onClick={() => onSelectCategory(id)}
              className="flex h-full w-full flex-col gap-2 rounded-2xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate text-sm font-medium">{name}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    toneClasses.text,
                  )}
                >
                  {percent}%
                </span>
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatPoints(category.pointsAwarded)}/{category.maxPoints} pts
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <span
                  className={cn("block h-full rounded-full", toneClasses.bar)}
                  style={{ width: `${percent}%` }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
