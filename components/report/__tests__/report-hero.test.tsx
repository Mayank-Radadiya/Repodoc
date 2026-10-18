import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeReportPreview } from "@/components/report/report-preview";
import { ReportHero } from "@/components/report/report-hero";
import { makeFixtureReport } from "./report-fixtures";

afterEach(cleanup);

function renderHero(
  options: Partial<Parameters<typeof ReportHero>[0]> & {
    previewedIds?: ReadonlySet<string>;
  } = {},
) {
  const { previewedIds, ...overrides } = options;
  const report = makeFixtureReport();
  const preview = computeReportPreview(report, previewedIds ?? new Set());
  return render(
    <ReportHero report={report} preview={preview} {...overrides} />,
  );
}

describe("ReportHero", () => {
  it("renders the repository identity and report description", () => {
    renderHero();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("example/repository");
    expect(screen.getByText("Repository health report")).toBeDefined();
  });

  it("renders the audited score, passed checks, and pass rate in the overview", () => {
    renderHero();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("41");
    expect(screen.getByText("3 of 7 checks passed")).toBeDefined();
    expect(
      screen
        .getByRole("img", { name: /pass rate/i })
        .getAttribute("aria-label"),
    ).toContain("43%");
    expect(
      screen.getByText(/inspected for presence, not executed/i),
    ).toBeDefined();
  });

  it("distinguishes previewed results from the audited score", () => {
    renderHero({ previewedIds: new Set(["sec-policy"]) });
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("51");
    expect(screen.getByTestId("preview-delta").textContent).toContain("+10");
    expect(screen.getByText(/Audited score: 41/)).toBeDefined();
  });

  it("links to the repository on GitHub in a new tab", () => {
    renderHero();
    const link = screen.getByRole("link", { name: /view on github/i });
    expect(link.getAttribute("href")).toBe(
      "https://github.com/example/repository",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows the health status from the preview score and palette", () => {
    renderHero();
    const pill = screen.getByTestId("hero-status-pill");
    expect(pill.textContent).toContain("Needs Improvement");
    expect(pill.textContent).toContain("41/100");
    expect(pill.getAttribute("data-badge-color")).toBe("orange");
  });

  it("shows branch, audited time, and rubric version", () => {
    renderHero();
    const time = screen.getByText((_, element) => element?.tagName === "TIME");
    expect(time.getAttribute("dateTime")).toBe("2026-10-13T12:00:00.000Z");
    expect(screen.getByText("main")).toBeDefined();
    expect(screen.getByText("1.0.0")).toBeDefined();
  });

  it("hides the preview pill while no fixes are previewed", () => {
    renderHero({ onClearPreview: vi.fn() });
    expect(screen.queryByTestId("hero-preview-pill")).toBeNull();
  });

  it("clears previews from the preview pill", () => {
    const onClearPreview = vi.fn();
    renderHero({
      previewedIds: new Set(["sec-policy"]),
      onClearPreview,
    });

    const pill = screen.getByTestId("hero-preview-pill");
    expect(pill.textContent).toContain("+10");
    fireEvent.click(pill);
    expect(onClearPreview).toHaveBeenCalledTimes(1);
  });

  it("renders the actions, feedback, and pillars slots", () => {
    renderHero({
      actions: <button type="button">Re-audit</button>,
      feedback: <p>Something happened</p>,
      pillars: <div data-testid="pillar-slot" />,
    });
    expect(screen.getByRole("button", { name: "Re-audit" })).toBeDefined();
    expect(screen.getByText("Something happened")).toBeDefined();
    expect(screen.getByTestId("pillar-slot")).toBeDefined();
  });

  it("renders the full preview delta in the preview pill", () => {
    renderHero({
      previewedIds: new Set(["sec-policy", "metadata"]),
      onClearPreview: vi.fn(),
    });
    const pill = screen.getByTestId("hero-preview-pill");
    expect(within(pill).getByText(/\+13\.5/)).toBeDefined();
  });
});
