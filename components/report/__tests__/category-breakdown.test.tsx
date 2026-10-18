import { useMemo, useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditReport, CategoryId } from "@/src/lib/types";
import { CategoryBreakdown } from "@/components/report/category-breakdown";
import { CategoryBreakdown as CategoryBreakdownFromBarrel } from "@/components/report";
import { CategoryBreakdown as CategoryBreakdownFromShim } from "@/src/components/report/category-breakdown";
import { computeReportPreview } from "@/components/report/report-preview";
import { makeCheck, makeFixtureReport } from "./report-fixtures";

afterEach(cleanup);

interface HarnessProps {
  report?: AuditReport;
  previewedIds?: ReadonlySet<string>;
  onTogglePreview?: (checkId: string) => void;
  initialOpen?: CategoryId[];
}

function BreakdownHarness({
  report = makeFixtureReport(),
  previewedIds = new Set(),
  onTogglePreview = () => {},
  initialOpen = ["documentation"],
}: HarnessProps) {
  const [openCategories, setOpenCategories] =
    useState<CategoryId[]>(initialOpen);
  const preview = useMemo(
    () => computeReportPreview(report, previewedIds),
    [report, previewedIds],
  );

  return (
    <CategoryBreakdown
      report={report}
      preview={preview}
      previewedIds={previewedIds}
      onTogglePreview={onTogglePreview}
      openCategories={openCategories}
      onOpenCategoriesChange={setOpenCategories}
    />
  );
}

const ALL_CATEGORIES: CategoryId[] = [
  "documentation",
  "hygiene",
  "testing_ci",
  "community",
  "security",
];

function accordionTriggers(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'),
  );
}

function categoryTrigger(name: string): HTMLElement {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

function checkRow(name: string): HTMLElement {
  const row = screen.getByText(name).closest("li");
  if (!row) throw new Error(`No row found for check ${name}`);
  return row as HTMLElement;
}

describe("CategoryBreakdown", () => {
  it("renders the findings heading and check counts", () => {
    render(<BreakdownHarness />);

    const region = screen.getByRole("region", { name: "Findings" });
    expect(region).toBeDefined();
    expect(
      within(region).getByText("7 checks across 5 categories"),
    ).toBeDefined();
    expect(
      within(region).getByText(/explore the evidence behind each check/i),
    ).toBeDefined();
  });

  it("lists the five categories in canonical order with effective scores", () => {
    render(<BreakdownHarness />);

    const triggers = accordionTriggers();
    expect(triggers).toHaveLength(5);
    expect(
      triggers.map((trigger) => trigger.getAttribute("aria-label")),
    ).toEqual([
      "Documentation: 12 out of 25 points",
      "Project Hygiene: 10 out of 20 points",
      "Testing & CI/CD: 15 out of 25 points",
      "Community & Metadata: 3.5 out of 15 points",
      "Security Baseline: 0 out of 15 points",
    ]);

    const documentation = categoryTrigger("Documentation");
    expect(within(documentation).getByText("12/25 pts")).toBeDefined();
    expect(within(documentation).getByText("1 of 2 passed")).toBeDefined();

    const security = categoryTrigger("Security Baseline");
    expect(within(security).getByText("0/15 pts")).toBeDefined();
    expect(within(security).getByText("0 of 1 passed")).toBeDefined();
  });

  it("opens only the documentation category by default", () => {
    render(<BreakdownHarness />);

    expect(categoryTrigger("Documentation").getAttribute("aria-expanded")).toBe(
      "true",
    );
    for (const name of [
      "Project Hygiene",
      "Testing & CI/CD",
      "Community & Metadata",
      "Security Baseline",
    ]) {
      expect(categoryTrigger(name).getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("shows filter counts and filters checks by status", () => {
    render(<BreakdownHarness initialOpen={ALL_CATEGORIES} />);

    const allFilter = screen.getByRole("button", { name: "All checks (7)" });
    expect(allFilter.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Failed (4)" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Passed (3)" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Failed (4)" }));
    expect(screen.getByText("Security policy")).toBeDefined();
    expect(screen.getByText(".gitignore")).toBeDefined();
    expect(screen.queryByText("README")).toBeNull();
    expect(screen.queryByText("CI workflow")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Passed (3)" }));
    expect(screen.getByText("README")).toBeDefined();
    expect(screen.getByText("CI workflow")).toBeDefined();
    expect(screen.queryByText("Security policy")).toBeNull();
  });

  it("updates counts, rows, and points when fixes are previewed", () => {
    const report = makeFixtureReport();
    const onTogglePreview = vi.fn();
    const { rerender } = render(
      <BreakdownHarness
        report={report}
        onTogglePreview={onTogglePreview}
        initialOpen={ALL_CATEGORIES}
      />,
    );

    const securityRow = checkRow("Security policy");
    expect(within(securityRow).getByText("Failed")).toBeDefined();
    expect(within(securityRow).getByText("0/10 pts")).toBeDefined();

    const previewButton = within(securityRow).getByRole("button", {
      name: /preview fix for security policy: \+10 pts/i,
    });
    expect(previewButton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(previewButton);
    expect(onTogglePreview).toHaveBeenCalledWith("sec-policy");

    rerender(
      <BreakdownHarness
        report={report}
        previewedIds={new Set(["sec-policy"])}
        initialOpen={ALL_CATEGORIES}
      />,
    );

    expect(screen.getByRole("button", { name: "Failed (3)" })).toBeDefined();
    const previewedRow = checkRow("Security policy");
    expect(within(previewedRow).getByText("Previewed")).toBeDefined();
    expect(within(previewedRow).getByText("10/10 pts")).toBeDefined();
    const removeButton = within(previewedRow).getByRole("button", {
      name: /remove preview for security policy/i,
    });
    expect(removeButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("previews the highest-value fix from the heading shortcut", () => {
    const onTogglePreview = vi.fn();
    render(
      <BreakdownHarness
        onTogglePreview={onTogglePreview}
        initialOpen={["documentation"]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /preview fix for headings: \+6 pts/i,
      }),
    );
    expect(onTogglePreview).toHaveBeenCalledWith("headings");
  });

  it("filters checks by keyword and clears the search", () => {
    render(<BreakdownHarness initialOpen={ALL_CATEGORIES} />);

    const input = screen.getByRole("searchbox", { name: /search checks/i });
    fireEvent.change(input, { target: { value: "head" } });

    expect(screen.getByText("Headings")).toBeDefined();
    expect(screen.queryByText("README")).toBeNull();
    expect(screen.queryByText("CI workflow")).toBeNull();
    expect(accordionTriggers()).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toBe("1 of 7 checks shown");

    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(input).toHaveProperty("value", "");
    expect(screen.getByText("README")).toBeDefined();
    expect(
      screen.queryAllByText("No checks match the current filter."),
    ).toHaveLength(0);
  });

  it("shows one actionable empty state when nothing matches", () => {
    render(<BreakdownHarness initialOpen={ALL_CATEGORIES} />);

    fireEvent.change(
      screen.getByRole("searchbox", { name: /search checks/i }),
      {
        target: { value: "zzz" },
      },
    );

    expect(screen.queryByText("README")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "No checks match your filters" }),
    ).toBeDefined();
    expect(accordionTriggers()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Show all checks" }));
    expect(screen.getByText("README")).toBeDefined();
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
  });

  it("reveals matching checks in previously collapsed categories and searches paths", () => {
    render(<BreakdownHarness />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "sec-policy.md" },
    });
    expect(screen.getByText("Security policy")).toBeDefined();
    expect(
      categoryTrigger("Security Baseline").getAttribute("aria-expanded"),
    ).toBe("true");
    expect(accordionTriggers()).toHaveLength(1);
  });

  it("sorts within categories by recoverable points, name, and original rubric order", () => {
    render(<BreakdownHarness />);
    const names = () =>
      within(screen.getByRole("list", { name: "Documentation checks" }))
        .getAllByRole("listitem")
        .map((row) => row.querySelector("p")?.textContent);
    expect(names()).toEqual(["Headings", "README"]);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Sort checks within categories" }),
      { target: { value: "rubric" } },
    );
    expect(names()).toEqual(["README", "Headings"]);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "name" },
    });
    expect(names()).toEqual(["Headings", "README"]);
  });

  it("keeps matching groups collapsible while filtering", () => {
    render(<BreakdownHarness />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "security" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(
      categoryTrigger("Security Baseline").getAttribute("aria-expanded"),
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(
      categoryTrigger("Security Baseline").getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("expands and collapses all categories", () => {
    render(<BreakdownHarness />);

    fireEvent.click(screen.getByRole("button", { name: /expand all/i }));
    for (const trigger of accordionTriggers()) {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    }

    fireEvent.click(screen.getByRole("button", { name: /collapse all/i }));
    for (const trigger of accordionTriggers()) {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("shows evidence excerpts before opening full details", () => {
    render(<BreakdownHarness />);
    const row = checkRow("README");
    expect(within(row).getByText("Evidence details for README")).toBeDefined();
    expect(within(row).queryByText("Files checked")).toBeNull();
    fireEvent.click(within(row).getByRole("button", { name: /evidence and remediation/i }));
    expect(within(row).getAllByText("Evidence details for README")).toHaveLength(1);
    expect(within(row).getByText("Files checked")).toBeDefined();
  });

  it("reveals evidence for a check independently", () => {
    render(<BreakdownHarness />);

    const row = checkRow("README");
    const trigger = within(row).getByRole("button", {
      name: /evidence and remediation for readme/i,
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    const panelId = trigger.getAttribute("aria-controls");
    const panel = document.getElementById(panelId ?? "");
    expect(panel).not.toBeNull();
    expect(
      within(panel as HTMLElement).getByText("Evidence details for README"),
    ).toBeDefined();
    expect(within(panel as HTMLElement).getByText(/found/i)).toBeDefined();
    expect(within(panel as HTMLElement).getByText("readme.md")).toBeDefined();

    const otherRow = checkRow("Headings");
    expect(
      within(otherRow)
        .getByRole("button", { name: /evidence and remediation for headings/i })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("shows remediation details with a GitHub create link", () => {
    const report = makeFixtureReport();
    const checks = report.checks.map((check) =>
      check.id === "headings"
        ? makeCheck("headings", "Headings", "documentation", 4, 10, false, {
            remediation: {
              canAutomate: true,
              targetPath: "CONTRIBUTING.md",
              description: "Add a contributing guide.",
            },
          })
        : check,
    );
    render(
      <BreakdownHarness
        report={{ ...report, checks }}
        initialOpen={["documentation"]}
      />,
    );

    fireEvent.click(
      within(checkRow("Headings")).getByRole("button", {
        name: /evidence and remediation for headings/i,
      }),
    );

    expect(screen.getByText("Add a contributing guide.")).toBeDefined();
    const createLink = screen.getByRole("link", {
      name: /create contributing\.md on github/i,
    });
    expect(createLink.getAttribute("href")).toBe(
      "https://github.com/example/repository/new/main?filename=CONTRIBUTING.md",
    );
    expect(createLink.getAttribute("target")).toBe("_blank");
    expect(createLink.getAttribute("rel")).toContain("noopener");
  });

  it("renders evidence paths as plain text without injection", () => {
    const report = makeFixtureReport();
    const checks = report.checks.map((check) =>
      check.id === "readme"
        ? makeCheck("readme", "README", "documentation", 8, 8, true, {
            evidence: {
              filesChecked: ["<img src=x onerror=alert(1)>.md"],
              found: true,
              details: "Evidence for README",
            },
          })
        : check,
    );
    render(<BreakdownHarness report={{ ...report, checks }} />);

    fireEvent.click(
      within(checkRow("README")).getByRole("button", {
        name: /evidence and remediation for readme/i,
      }),
    );

    expect(screen.getByText("<img src=x onerror=alert(1)>.md")).toBeDefined();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("does not mutate frozen report inputs", () => {
    const report = makeFixtureReport();
    report.checks.forEach((check) => Object.freeze(check));
    Object.freeze(report.checks);
    Object.freeze(report);
    const snapshot = JSON.stringify(report);

    render(<BreakdownHarness report={report} initialOpen={ALL_CATEGORIES} />);
    fireEvent.click(screen.getByRole("button", { name: "Failed (4)" }));
    fireEvent.change(
      screen.getByRole("searchbox", { name: /search checks/i }),
      {
        target: { value: "readme" },
      },
    );

    expect(JSON.stringify(report)).toBe(snapshot);
  });

  it("keeps every svg decorative", () => {
    render(<BreakdownHarness initialOpen={ALL_CATEGORIES} />);

    const region = screen.getByRole("region", { name: "Findings" });
    for (const svg of region.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("errors on duplicate check ids", () => {
    const report = makeFixtureReport();
    const duplicated = [...report.checks, report.checks[0]];

    expect(() =>
      render(<BreakdownHarness report={{ ...report, checks: duplicated }} />),
    ).toThrow(/duplicate/i);
  });

  it("exposes the same component from the barrel and the src shim", () => {
    expect(CategoryBreakdownFromBarrel).toBe(CategoryBreakdown);
    expect(CategoryBreakdownFromShim).toBe(CategoryBreakdown);
  });
});
