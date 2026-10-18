import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportView } from "../report-view";
import { makeCheck, makeFixtureReport } from "./report-fixtures";

let scrollIntoViewMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  scrollIntoViewMock = vi.fn();
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: scrollIntoViewMock,
  });
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as unknown as { scrollIntoView?: unknown })
    .scrollIntoView;
  vi.restoreAllMocks();
});

function renderView(options: { baseUrl?: string | null } = {}) {
  const { baseUrl = "https://repodoc.dev" } = options;
  const report = makeFixtureReport();
  return render(
    <ReportView
      report={report}
      baseUrl={baseUrl}
      actions={<button type="button">Re-audit</button>}
      feedback={<p role="status">Audit finished.</p>}
    />,
  );
}

describe("ReportView", () => {
  it("renders the hero, pillar strip, breakdown, gauge, and badge card together", () => {
    renderView();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "example/repository",
    );
    expect(document.querySelectorAll("[data-category]")).toHaveLength(5);
    expect(
      document.querySelectorAll('[data-slot="accordion-trigger"]'),
    ).toHaveLength(5);
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("41");
    expect(
      screen.getByRole("heading", { name: /add a health badge/i }),
    ).toBeDefined();
  });

  it("shows the audited status until a fix is previewed", () => {
    renderView();

    expect(screen.getByTestId("hero-status-pill").textContent).toContain(
      "Needs Improvement",
    );
    expect(screen.queryByTestId("hero-preview-pill")).toBeNull();
  });

  it("applies a previewed fix across hero, gauge, and breakdown", () => {
    renderView();

    fireEvent.click(
      screen.getByRole("button", {
        name: /preview fix for security policy: \+10 pts/i,
      }),
    );

    const heroPill = screen.getByTestId("hero-preview-pill");
    expect(heroPill.textContent).toContain("+10");
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("51");
    expect(screen.getByTestId("preview-delta").textContent).toContain("+10");

    const row = screen
      .getByText("Security policy")
      .closest("li") as HTMLElement;
    expect(within(row).getByText("Previewed")).toBeDefined();

    fireEvent.click(heroPill);
    expect(screen.queryByTestId("hero-preview-pill")).toBeNull();
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("41");
  });

  it("previews the top three boosters from the improvement panel", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /preview top 3/i }));

    expect(screen.getByTestId("hero-preview-pill").textContent).toContain(
      "+21",
    );
    expect(screen.queryByRole("button", { name: /preview top 3/i })).toBeNull();
  });

  it("keeps the badge on the audited score while previewing fixes", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: /preview top 3/i }));
    expect(screen.getAllByRole("meter")).toHaveLength(1);
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("62");
    expect(screen.getByTestId("badge-preview-score").textContent).toBe(
      "41/100",
    );
  });

  it("clears filters, opens the matching category, and scrolls when a pillar is selected", async () => {
    renderView();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "security" },
    });

    const stripButton = document.querySelector(
      '[data-category="hygiene"]',
    ) as HTMLElement;
    fireEvent.click(stripButton);

    const trigger = screen.getByRole("button", { name: /^Project Hygiene:/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalledTimes(1));
  });

  it("renders the actions and feedback slots", () => {
    renderView();

    expect(screen.getByRole("button", { name: "Re-audit" })).toBeDefined();
    expect(screen.getByText("Audit finished.")).toBeDefined();
  });

  it("shows a busy badge placeholder when no base URL is available", () => {
    renderView({ baseUrl: null });

    expect(
      screen.queryByRole("heading", { name: /add a health badge/i }),
    ).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("opens the category with the most recoverable points and keeps all checks selected", () => {
    renderView();
    expect(screen.getByRole("button", { name: /^Security Baseline:/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /^Documentation:/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "All checks (7)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("sums recoverable points within each category and breaks ties in rubric order", () => {
    const report = makeFixtureReport();
    report.checks = [
      makeCheck("security", "Security", "security", 0, 10, false),
      makeCheck("docs-a", "Documentation A", "documentation", 0, 5, false),
      makeCheck("docs-b", "Documentation B", "documentation", 0, 5, false),
    ];
    render(<ReportView report={report} baseUrl={null} />);
    expect(screen.getByRole("button", { name: /^Documentation:/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /^Security Baseline:/ }).getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the first populated category when all checks pass", () => {
    const report = makeFixtureReport();
    report.checks = [makeCheck("ci", "CI", "testing_ci", 15, 15, true)];
    render(<ReportView report={report} baseUrl={null} />);
    expect(screen.getByRole("button", { name: /^Testing & CI\/CD:/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/every check passes/i)).toBeDefined();
  });

  it("handles an empty report without expanding a category", () => {
    const report = { ...makeFixtureReport(), checks: [], healthScore: 0 };
    render(<ReportView report={report} baseUrl={null} />);
    expect(screen.getByText("No checks in this report")).toBeDefined();
    expect(document.querySelector('[data-slot="accordion-trigger"][aria-expanded="true"]')).toBeNull();
  });

  it("preserves expanded categories during previews and resets transient state for a new audit", () => {
    const report = makeFixtureReport();
    const { rerender } = render(<ReportView report={report} baseUrl={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Documentation:/ }));
    fireEvent.click(screen.getByRole("button", { name: /preview fix for security policy/i }));
    expect(screen.getByRole("button", { name: /^Documentation:/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /^Security Baseline:/ }).getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "security" } });
    rerender(<ReportView report={{ ...report, generatedAt: "2026-10-18T12:00:00.000Z" }} baseUrl={null} />);
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "");
    expect(screen.queryByTestId("hero-preview-pill")).toBeNull();
    expect(screen.getByRole("button", { name: /^Documentation:/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: /^Security Baseline:/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("links each section navigation item to an existing report section", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Report sections" });
    for (const link of within(nav).getAllByRole("link")) {
      expect(document.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });
});
