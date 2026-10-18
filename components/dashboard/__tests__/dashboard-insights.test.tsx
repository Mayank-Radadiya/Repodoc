import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardInsightsPanel } from "../dashboard-insights";
import { getDashboardInsights } from "../dashboard-model";
import { sampleDashboardData } from "./fixtures";

describe("DashboardInsightsPanel", () => {
  afterEach(cleanup);

  it("provides textual health counts alongside the visualization", () => {
    render(<DashboardInsightsPanel insights={getDashboardInsights(sampleDashboardData.repositories)} />);
    const legend = within(screen.getByLabelText("Repository health distribution"));
    expect(legend.getByText("Excellent").nextElementSibling?.textContent).toBe("1");
    expect(legend.getByText("Critical").nextElementSibling?.textContent).toBe("0");
    expect(legend.getByText("Unscored").nextElementSibling?.textContent).toBe("1");
  });

  it("distinguishes missing dates on saved audits from having no audits", () => {
    const { rerender } = render(<DashboardInsightsPanel insights={getDashboardInsights([])} />);
    expect(screen.getByText("No saved audits yet")).toBeDefined();
    expect(screen.getByText("Language insights appear when repositories are available.")).toBeDefined();
    rerender(<DashboardInsightsPanel insights={getDashboardInsights([
      { ...sampleDashboardData.repositories[0], lastAuditedAt: "invalid", healthScore: null },
    ])} />);
    expect(screen.getByText("Audit dates unavailable")).toBeDefined();
    expect(screen.queryByText("No saved audits yet")).toBeNull();
    const latest = screen.getByRole("region", { name: "Latest audits" });
    expect(within(latest).queryByRole("link")).toBeNull();
  });
});
