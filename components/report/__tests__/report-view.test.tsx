import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportView } from "../report-view";
import { makeFixtureReport } from "./report-fixtures";

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
      screen.getByRole("button", { name: /^Security Baseline:/ }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /preview fix for security policy: \+10 pts/i,
      }),
    );

    const heroPill = screen.getByTestId("hero-preview-pill");
    expect(heroPill.textContent).toContain("+10");
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("51");
    expect(screen.getByTestId("preview-delta").textContent).toContain("+10");

    const row = screen.getByText("Security policy").closest("li") as HTMLElement;
    expect(within(row).getByText("Previewed")).toBeDefined();

    fireEvent.click(heroPill);
    expect(screen.queryByTestId("hero-preview-pill")).toBeNull();
    expect(screen.getByRole("meter").getAttribute("data-score")).toBe("41");
  });

  it("previews the top three boosters from the gauge card", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /preview top 3/i }));

    expect(screen.getByTestId("hero-preview-pill").textContent).toContain(
      "+21",
    );
    expect(screen.queryByRole("button", { name: /preview top 3/i })).toBeNull();
  });

  it("opens the matching category and scrolls to it when a pillar is selected", () => {
    renderView();

    const stripButton = document.querySelector(
      '[data-category="hygiene"]',
    ) as HTMLElement;
    fireEvent.click(stripButton);

    const trigger = screen.getByRole("button", { name: /^Project Hygiene:/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
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
});
