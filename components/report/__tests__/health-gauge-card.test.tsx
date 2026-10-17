import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthGaugeCard } from "@/components/report/health-gauge-card";
import { computeReportPreview } from "@/components/report/report-preview";
import { makeCheck, makeFixtureReport } from "./report-fixtures";
import type { AuditReport } from "@/src/lib/types";

afterEach(cleanup);

function renderCard(
  previewedIds: ReadonlySet<string> = new Set(),
  report: AuditReport = makeFixtureReport(),
) {
  const preview = computeReportPreview(report, previewedIds);
  const onTogglePreview = vi.fn();
  const onApplyBoosters = vi.fn();
  render(
    <HealthGaugeCard
      report={report}
      preview={preview}
      previewedIds={previewedIds}
      onTogglePreview={onTogglePreview}
      onApplyBoosters={onApplyBoosters}
    />,
  );
  return { onTogglePreview, onApplyBoosters };
}

describe("HealthGaugeCard", () => {
  it("renders the score gauge with the audited score", () => {
    renderCard();
    const gauge = screen.getByRole("meter");
    expect(gauge.getAttribute("data-score")).toBe("41");
    expect(gauge.getAttribute("aria-valuenow")).toBe("41");
  });

  it("renders the checks passed count", () => {
    renderCard();
    expect(screen.getByText("3 of 7 checks passed")).toBeDefined();
  });

  it("reports the pass rate", () => {
    renderCard();
    const rate = screen.getByRole("img", { name: /pass rate/i });
    expect(rate.getAttribute("aria-label")).toContain("43%");
    expect(rate.getAttribute("aria-label")).toContain("3 of 7 checks");
  });

  it("lists the top boosters by recoverable points", () => {
    renderCard();
    const rows = screen.getAllByRole("button", { name: /preview/i });
    const boosters = rows.filter((row) =>
      row.getAttribute("aria-label")?.match(/preview \+\d/g),
    );
    const names = boosters.map((row) => row.getAttribute("aria-label"));
    expect(names[0]).toContain("Security policy");
    expect(names[1]).toContain("Headings");
    expect(names[2]).toContain(".gitignore");
  });

  it("toggles a booster preview on click", () => {
    const { onTogglePreview } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /Security policy/ }));
    expect(onTogglePreview).toHaveBeenCalledWith("sec-policy");
  });

  it("applies the top three boosters together", () => {
    const { onApplyBoosters } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: /preview top 3/i }));
    expect(onApplyBoosters).toHaveBeenCalledWith([
      "sec-policy",
      "headings",
      "gitignore",
    ]);
  });

  it("marks previewed boosters as pressed and drops them from the list", () => {
    renderCard(new Set(["sec-policy"]));
    expect(
      screen.queryByRole("button", { name: /Security policy/ }),
    ).toBeNull();
    const next = screen.getByRole("button", { name: /Headings/ });
    expect(next.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows the preview delta under the gauge", () => {
    renderCard(new Set(["sec-policy"]));
    expect(screen.getByTestId("preview-delta").textContent).toContain("+10");
  });

  it("shows an honest empty state when every check passes", () => {
    const report: AuditReport = {
      owner: "example",
      repo: "repository",
      defaultBranch: "main",
      healthScore: 10,
      rubricVersion: "1.0.0",
      generatedAt: "2026-10-13T12:00:00.000Z",
      checks: [makeCheck("readme", "README", "documentation", 10, 10, true)],
    };
    renderCard(new Set(), report);
    expect(screen.getByText(/every check passes/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /preview top 3/i })).toBeNull();
  });

  it("explains when all failing checks are previewed", () => {
    renderCard(
      new Set(["sec-policy", "headings", "gitignore", "metadata"]),
    );
    expect(screen.getByText(/all failing checks are previewed/i)).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /preview top 3/i }),
    ).toBeNull();
  });

  it("keeps the disclaimer about inspection-only auditing", () => {
    renderCard();
    expect(
      screen.getByText(/inspected for presence, not executed/i),
    ).toBeDefined();
  });

  it("shows the status label matching the preview score", () => {
    renderCard(new Set(["sec-policy", "headings", "gitignore", "metadata"]));
    expect(screen.getByText("Fair")).toBeDefined();
  });
});
