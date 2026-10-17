import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoryPillarStrip } from "@/components/report/category-pillar-strip";
import { computeReportPreview } from "@/components/report/report-preview";
import { makeCheck, makeFixtureReport } from "./report-fixtures";
import type { AuditReport } from "@/src/lib/types";

afterEach(cleanup);

function renderStrip(
  report = makeFixtureReport(),
  previewedIds: ReadonlySet<string> = new Set(),
  onSelectCategory = vi.fn(),
) {
  const preview = computeReportPreview(report, previewedIds);
  render(
    <CategoryPillarStrip
      preview={preview}
      onSelectCategory={onSelectCategory}
    />,
  );
  return { onSelectCategory };
}

describe("CategoryPillarStrip", () => {
  it("renders one button per category with points and percent", () => {
    renderStrip();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);

    const docs = screen.getByRole("button", { name: /Documentation/ });
    expect(within(docs).getByText("12/25 pts")).toBeDefined();
    expect(within(docs).getByText("48%")).toBeDefined();
  });

  it("reports a selected category", () => {
    const { onSelectCategory } = renderStrip();
    fireEvent.click(screen.getByRole("button", { name: /Project Hygiene/ }));
    expect(onSelectCategory).toHaveBeenCalledWith("hygiene");
  });

  it("tones the progress bar by earned ratio", () => {
    renderStrip();
    expect(
      screen.getByRole("button", { name: /Documentation/ }).getAttribute("data-tone"),
    ).toBe("warning");
    expect(
      screen.getByRole("button", { name: /Security Baseline/ }).getAttribute("data-tone"),
    ).toBe("danger");
  });

  it("marks a fully earned category as success", () => {
    const report: AuditReport = {
      owner: "example",
      repo: "repository",
      defaultBranch: "main",
      healthScore: 25,
      rubricVersion: "1.0.0",
      generatedAt: "2026-10-13T12:00:00.000Z",
      checks: [
        makeCheck("readme", "README", "documentation", 8, 8, true),
        makeCheck("headings", "Headings", "documentation", 10, 10, true),
        makeCheck("architecture", "Architecture", "documentation", 4, 4, true),
        makeCheck("contributing", "Contributing", "documentation", 3, 3, true),
      ],
    };
    renderStrip(report);
    const docs = screen.getByRole("button", { name: /Documentation/ });
    expect(docs.getAttribute("data-tone")).toBe("success");
    expect(within(docs).getByText("25/25 pts")).toBeDefined();
    expect(within(docs).getByText("100%")).toBeDefined();
  });

  it("reflects previewed fixes in points and tone", () => {
    renderStrip(makeFixtureReport(), new Set(["sec-policy"]));
    const security = screen.getByRole("button", { name: /Security Baseline/ });
    expect(within(security).getByText("10/15 pts")).toBeDefined();
    expect(within(security).getByText("67%")).toBeDefined();
    expect(security.getAttribute("data-tone")).toBe("warning");
  });
});
