"use client";

import { cn } from "@/lib/utils";
import type { CategoryId } from "@/lib/types";
import { REPORT_CATEGORIES } from "./categories";
import { formatPoints, type ReportPreview } from "./report-preview";
import styles from "./report.module.css";

export type PillarTone = "success" | "warning" | "danger";

export function getPillarTone(
  pointsAwarded: number,
  maxPoints: number,
): PillarTone {
  const ratio = maxPoints > 0 ? pointsAwarded / maxPoints : 0;
  if (ratio >= 0.75) return "success";
  if (ratio >= 0.25) return "warning";
  return "danger";
}

const TONE_CLASSES: Record<PillarTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
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
      className={cn(styles.categoryGrid, className)}
    >
      {REPORT_CATEGORIES.map(({ id, name, icon: Icon }) => {
        const category = preview.categories[id];
        const percent =
          category.maxPoints > 0
            ? Math.round((category.pointsAwarded / category.maxPoints) * 100)
            : 0;
        const tone = getPillarTone(category.pointsAwarded, category.maxPoints);
        return (
          <li key={id} className="min-w-0">
            <button
              type="button"
              data-category={id}
              data-tone={tone}
              aria-label={`View ${name} checks: ${formatPoints(category.pointsAwarded)} of ${category.maxPoints} points (${percent}%). View checks.`}
              onClick={() => onSelectCategory(id)}
              className={styles.categoryButton}
            >
              <span className={styles.categoryLabel}>
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span>{name}</span>
              </span>
              <span className={styles.categoryPoints}>
                <span className={styles.categoryEarned}>
                  {formatPoints(category.pointsAwarded)}
                </span>
                <span> / {category.maxPoints}</span>
                <span className="sr-only"> pts · {percent}%</span>
              </span>
              <span aria-hidden="true" className={styles.categoryBar}>
                <span
                  className={cn(
                    "block h-full rounded-full",
                    TONE_CLASSES[tone],
                  )}
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
