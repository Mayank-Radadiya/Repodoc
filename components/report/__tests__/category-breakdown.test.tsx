import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBreakdown } from "@/components/report/category-breakdown";
import { CategoryBreakdown as RootExport } from "@/components/report";
import { CategoryBreakdown as SrcExport } from "@/src/components/report/category-breakdown";
import { CategoryBreakdown as SrcBarrelExport } from "@/src/components/report";
import type { AuditReport, CategoryId, CheckResult, PersistedAuditReport } from "@/src/lib/types";

function makeCheck(
  id: string,
  name: string,
  category: CategoryId,
  pointsAwarded: number,
  maxPoints: number,
  passed: boolean,
): CheckResult {
  return {
    id,
    name,
    category,
    pointsAwarded,
    maxPoints,
    passed,
    evidence: {
      details: `Evidence details for ${name}`,
      found: passed,
      filesChecked: [`${id}.md`],
    },
  };
}

function makeReport(): AuditReport {
  return {
    owner: "example",
    repo: "repository",
    defaultBranch: "main",
    healthScore: 46.5,
    rubricVersion: "1.0.0",
    generatedAt: "2026-10-13T12:00:00.000Z",
    // Interleaved categories ensure grouping does not depend on input order.
    checks: [
      makeCheck("security", "Security policy", "security", 0, 10, false),
      makeCheck("readme", "README present", "documentation", 8, 8, true),
      makeCheck("license", "License present", "hygiene", 10, 10, true),
      makeCheck("headings", "README headings", "documentation", 10, 10, true),
      makeCheck("gitignore", "Gitignore present", "hygiene", 0, 5, false),
      makeCheck("ci", "CI workflow", "testing_ci", 15, 15, true),
      makeCheck("metadata", "Repository metadata", "community", 3.5, 7, false),
    ],
  };
}

function categoryTrigger(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

describe("CategoryBreakdown", () => {
  it("shows all five category names and rubric scores in order", () => {
    render(<CategoryBreakdown report={makeReport()} />);

    const categories = [
      ["Documentation", "18/25"],
      ["Project Hygiene", "10/20"],
      ["Testing & CI/CD", "15/25"],
      ["Community & Metadata", "3.5/15"],
      ["Security Baseline", "0/15"],
    ];
    const triggers = screen.getAllByRole("button").filter(
      (button) => button.getAttribute("data-slot") === "accordion-trigger",
    );

    expect(triggers).toHaveLength(5);
    categories.forEach(([name, score], index) => {
      expect(triggers[index].textContent).toContain(name);
      expect(within(triggers[index]).getByText(score)).toBeDefined();
    });
    expect(screen.getByRole("region", { name: "Category breakdown" })).toBeDefined();
  });

  it("opens Documentation initially and leaves evidence and other categories closed", () => {
    render(<CategoryBreakdown report={makeReport()} />);

    expect(categoryTrigger("Documentation").getAttribute("aria-expanded")).toBe("true");
    expect(categoryTrigger("Project Hygiene").getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("README present")).toBeDefined();
    expect(screen.queryByText("License present")).toBeNull();
    expect(screen.getByRole("button", { name: "Evidence for README present" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Evidence details for README present")).toBeNull();
  });

  it("allows multiple categories to stay open and collapse independently", async () => {
    render(<CategoryBreakdown report={makeReport()} />);
    const documentation = categoryTrigger("Documentation");
    const hygiene = categoryTrigger("Project Hygiene");

    fireEvent.click(hygiene);
    expect(hygiene.getAttribute("aria-expanded")).toBe("true");
    expect(documentation.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("License present")).toBeDefined();

    fireEvent.click(documentation);
    expect(documentation.getAttribute("aria-expanded")).toBe("false");
    expect(hygiene.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(screen.queryByText("README present")).toBeNull());
  });

  it("groups each check into its category and preserves check order", () => {
    const report = makeReport();
    render(<CategoryBreakdown report={report} />);
    ["Project Hygiene", "Testing & CI/CD", "Community & Metadata", "Security Baseline"].forEach(
      (name) => fireEvent.click(categoryTrigger(name)),
    );

    [
      ["Documentation", "documentation"],
      ["Project Hygiene", "hygiene"],
      ["Testing & CI/CD", "testing_ci"],
      ["Community & Metadata", "community"],
      ["Security Baseline", "security"],
    ].forEach(([label, id]) => {
      const list = screen.getByRole("list", { name: `${label} checks` });
      const rows = within(list).getAllByRole("listitem");
      const expectedChecks = report.checks.filter((check) => check.category === id);
      expect(rows).toHaveLength(expectedChecks.length);
      expectedChecks.forEach((check, index) => {
        expect(within(rows[index]).getByText(check.name)).toBeDefined();
        expect(within(rows[index]).getByText(`${check.pointsAwarded}/${check.maxPoints} points`)).toBeDefined();
        expect(within(rows[index]).getByText(check.passed ? "Passed" : "Failed")).toBeDefined();
      });
    });
  });

  it("retains fractional partial credit for a failed check", () => {
    render(<CategoryBreakdown report={makeReport()} />);
    fireEvent.click(categoryTrigger("Community & Metadata"));

    expect(within(categoryTrigger("Community & Metadata")).getByText("3.5/15")).toBeDefined();
    const list = screen.getByRole("list", { name: "Community & Metadata checks" });
    expect(within(list).getByText("3.5/7 points")).toBeDefined();
    expect(within(list).getByText("Failed")).toBeDefined();
  });

  it("expands evidence independently and shows details, found status, and paths", async () => {
    render(<CategoryBreakdown report={makeReport()} />);
    const readmeEvidence = screen.getByRole("button", { name: "Evidence for README present" });
    const headingsEvidence = screen.getByRole("button", { name: "Evidence for README headings" });

    fireEvent.click(readmeEvidence);
    expect(readmeEvidence.getAttribute("aria-expanded")).toBe("true");
    expect(headingsEvidence.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Evidence details for README present")).toBeDefined();
    expect(screen.getByText("Evidence: Found")).toBeDefined();
    expect(screen.getByText("readme.md")).toBeDefined();

    fireEvent.click(headingsEvidence);
    expect(readmeEvidence.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("headings.md")).toBeDefined();
    fireEvent.click(readmeEvidence);
    await waitFor(() => expect(screen.queryByText("readme.md")).toBeNull());
    expect(headingsEvidence.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows not-found evidence for a failed check", () => {
    render(<CategoryBreakdown report={makeReport()} />);
    fireEvent.click(categoryTrigger("Security Baseline"));
    fireEvent.click(screen.getByRole("button", { name: "Evidence for Security policy" }));
    expect(screen.getByText("Evidence: Not found")).toBeDefined();
  });

  it("uses passed for check status rather than inferring it from evidence.found", () => {
    const report = makeReport();
    report.checks[1].passed = false;
    render(<CategoryBreakdown report={report} />);

    const row = screen.getByText("README present").closest("li");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("Failed")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Evidence for README present" }));
    expect(screen.getByText("Evidence: Found")).toBeDefined();
    expect(within(categoryTrigger("Documentation")).getByText("18/25")).toBeDefined();
  });

  it("renders all categories and explicit empty panels for an empty report", () => {
    const report = makeReport();
    report.checks = [];
    report.healthScore = 0;
    render(<CategoryBreakdown report={report} />);

    [
      ["Documentation", "0/25"],
      ["Project Hygiene", "0/20"],
      ["Testing & CI/CD", "0/25"],
      ["Community & Metadata", "0/15"],
      ["Security Baseline", "0/15"],
    ].forEach(([name, score], index) => {
      const trigger = categoryTrigger(name);
      expect(within(trigger).getByText(score)).toBeDefined();
      if (index > 0) fireEvent.click(trigger);
    });

    expect(screen.getAllByText("No checks available")).toHaveLength(5);
    expect(screen.queryByText("Passed")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Evidence for/ })).toBeNull();
  });

  it("renders an empty category alongside populated categories", () => {
    const report = makeReport();
    report.checks = report.checks.filter((check) => check.category !== "security");
    render(<CategoryBreakdown report={report} />);
    fireEvent.click(categoryTrigger("Security Baseline"));

    expect(screen.getByText("No checks available")).toBeDefined();
    expect(screen.getByText("README present")).toBeDefined();
  });

  it.each(["", " \n "])("provides fallbacks for empty evidence details %j and files", (details) => {
    const report = makeReport();
    report.checks[1].evidence = { details, found: false, filesChecked: [] };
    render(<CategoryBreakdown report={report} />);
    fireEvent.click(screen.getByRole("button", { name: "Evidence for README present" }));

    expect(screen.getByText("No evidence details available")).toBeDefined();
    expect(screen.getByText("No files checked")).toBeDefined();
    expect(screen.getByText("Evidence: Not found")).toBeDefined();
  });

  it("renders long paths and markup as plain text without links or HTML injection", () => {
    const report = makeReport();
    const longPath = `directory/${"a".repeat(300)}/<script>file</script>.md`;
    const details = '<img src=x onerror="alert(1)">';
    report.checks[1].evidence = { details, found: true, filesChecked: [longPath, longPath] };
    const { container } = render(<CategoryBreakdown report={report} />);
    fireEvent.click(screen.getByRole("button", { name: "Evidence for README present" }));

    expect(screen.getByText(details)).toBeDefined();
    expect(screen.getAllByText(longPath)).toHaveLength(2);
    expect(container.querySelector("img, script, a")).toBeNull();
    expect(screen.getAllByText(longPath)[0].className).toContain("break-all");
  });

  it("links disclosure controls to panels and hides decorative icons", () => {
    const { container } = render(<CategoryBreakdown report={makeReport()} />);
    const category = categoryTrigger("Documentation");
    const categoryPanel = document.getElementById(category.getAttribute("aria-controls")!);
    expect(categoryPanel).not.toBeNull();
    expect(categoryPanel?.getAttribute("aria-labelledby")).toBe(category.id);

    const evidence = screen.getByRole("button", { name: "Evidence for README present" });
    fireEvent.click(evidence);
    const evidencePanel = document.getElementById(evidence.getAttribute("aria-controls")!);
    expect(evidencePanel).not.toBeNull();
    expect(evidencePanel?.textContent).toContain("Evidence details for README present");
    container.querySelectorAll("svg").forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
    category.focus();
    expect(document.activeElement).toBe(category);
    evidence.focus();
    expect(document.activeElement).toBe(evidence);
  });

  it("updates scores and check rows when report props change", () => {
    const report = makeReport();
    const { rerender } = render(<CategoryBreakdown report={report} />);
    const nextReport = makeReport();
    nextReport.checks[1] = { ...nextReport.checks[1], name: "Updated README", pointsAwarded: 4, passed: false };
    nextReport.checks = nextReport.checks.filter((check) => check.id !== "headings");
    rerender(<CategoryBreakdown report={nextReport} />);

    expect(within(categoryTrigger("Documentation")).getByText("4/25")).toBeDefined();
    expect(screen.getByText("Updated README")).toBeDefined();
    expect(screen.getByText("4/8 points")).toBeDefined();
    expect(screen.queryByText("README headings")).toBeNull();
    expect(screen.queryByText("README present")).toBeNull();
  });

  it("preserves frozen report inputs", () => {
    const report = makeReport();
    const original = JSON.stringify(report);
    report.checks.forEach((check) => {
      Object.freeze(check.evidence.filesChecked);
      Object.freeze(check.evidence);
      Object.freeze(check);
    });
    Object.freeze(report.checks);
    Object.freeze(report);
    render(<CategoryBreakdown report={report} />);
    fireEvent.click(categoryTrigger("Project Hygiene"));
    fireEvent.click(screen.getByRole("button", { name: "Evidence for License present" }));
    expect(JSON.stringify(report)).toBe(original);
  });

  it("supports persisted reports and custom className", () => {
    const report: PersistedAuditReport = { ...makeReport(), shareId: "abc12345" };
    render(<CategoryBreakdown report={report} className="custom-breakdown" />);
    expect(screen.getByRole("region", { name: "Category breakdown" }).className).toContain("custom-breakdown");
  });

  it("provides unique accessible IDs when multiple reports are rendered", () => {
    const { container } = render(
      <>
        <CategoryBreakdown report={makeReport()} />
        <CategoryBreakdown report={makeReport()} />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("[id]"), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(screen.getAllByRole("region", { name: "Category breakdown" })).toHaveLength(2);
  });

  it("preserves scoring helper validation for invalid reports", () => {
    const report = makeReport();
    report.checks.push(report.checks[0]);
    expect(() => render(<CategoryBreakdown report={report} />)).toThrow("duplicate check ID");
  });

  it("exports the same component from compatibility paths and both barrels", () => {
    expect(RootExport).toBe(CategoryBreakdown);
    expect(SrcExport).toBe(CategoryBreakdown);
    expect(SrcBarrelExport).toBe(CategoryBreakdown);
  });
});
