import { describe, expect, it } from "vitest";
import {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_IDS,
  getReportCategory,
} from "@/components/report/categories";

describe("report categories", () => {
  it("lists the five rubric categories in canonical order", () => {
    expect(REPORT_CATEGORIES.map((category) => category.id)).toEqual([
      "documentation",
      "hygiene",
      "testing_ci",
      "community",
      "security",
    ]);
    expect(REPORT_CATEGORY_IDS).toEqual([
      "documentation",
      "hygiene",
      "testing_ci",
      "community",
      "security",
    ]);
  });

  it("gives every category the expected display name", () => {
    expect(REPORT_CATEGORIES.map((category) => category.name)).toEqual([
      "Documentation",
      "Project Hygiene",
      "Testing & CI/CD",
      "Community & Metadata",
      "Security Baseline",
    ]);
  });

  it("provides a renderable icon component for every category", () => {
    for (const category of REPORT_CATEGORIES) {
      expect(typeof category.icon).not.toBe("undefined");
    }
  });

  it("getReportCategory returns the matching entry", () => {
    for (const category of REPORT_CATEGORIES) {
      expect(getReportCategory(category.id)).toBe(category);
    }
  });
});
