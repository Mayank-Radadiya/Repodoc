import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardSummary } from "../dashboard-summary";

describe("DashboardSummary", () => {
  afterEach(cleanup);

  it("shows coverage and the average of scored repositories", () => {
    render(
      <DashboardSummary
        stats={{
          totalRepos: 12,
          auditedCount: 8,
          unauditedCount: 4,
          averageScore: 89,
        }}
      />,
    );
    expect(
      screen
        .getByRole("progressbar", { name: "Audit coverage" })
        .getAttribute("aria-valuenow"),
    ).toBe("67");
    expect(screen.getByText("67% audited")).toBeDefined();
    expect(screen.getByText("4 repositories ready for an audit")).toBeDefined();
    expect(screen.getByText("89")).toBeDefined();
  });

  it("handles zero repositories without invalid percentages or scores", () => {
    render(
      <DashboardSummary
        stats={{
          totalRepos: 0,
          auditedCount: 0,
          unauditedCount: 0,
          averageScore: null,
        }}
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "0",
    );
    expect(screen.getByText("—")).toBeDefined();
    expect(screen.getByText("Run an audit to see your score")).toBeDefined();
  });

  it("handles a complete portfolio with a valid zero score", () => {
    render(
      <DashboardSummary
        stats={{
          totalRepos: 1,
          auditedCount: 1,
          unauditedCount: 0,
          averageScore: 0,
        }}
      />,
    );
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "100",
    );
    expect(screen.getByText("Every repository has an audit")).toBeDefined();
    expect(screen.queryByText("—")).toBeNull();
  });
});
