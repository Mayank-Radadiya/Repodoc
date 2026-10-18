import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/lib/types";

export interface ReportCategoryMeta {
  id: CategoryId;
  name: string;
  /** Compact label for tight surfaces such as the pillar strip. */
  shortName: string;
  icon: LucideIcon;
}

/**
 * Display metadata for the five rubric categories, in canonical report order.
 */
export const REPORT_CATEGORIES: readonly ReportCategoryMeta[] = [
  {
    id: "documentation",
    name: "Documentation",
    shortName: "Docs",
    icon: BookOpen,
  },
  {
    id: "hygiene",
    name: "Project Hygiene",
    shortName: "Hygiene",
    icon: Sparkles,
  },
  {
    id: "testing_ci",
    name: "Testing & CI/CD",
    shortName: "Testing",
    icon: Terminal,
  },
  {
    id: "community",
    name: "Community & Metadata",
    shortName: "Community",
    icon: Users,
  },
  {
    id: "security",
    name: "Security Baseline",
    shortName: "Security",
    icon: ShieldCheck,
  },
];

export const REPORT_CATEGORY_IDS: readonly CategoryId[] = REPORT_CATEGORIES.map(
  (category) => category.id,
);

export function getReportCategory(id: CategoryId): ReportCategoryMeta {
  const category = REPORT_CATEGORIES.find((entry) => entry.id === id);
  if (!category) {
    throw new Error(`Unknown report category: ${id}`);
  }
  return category;
}
