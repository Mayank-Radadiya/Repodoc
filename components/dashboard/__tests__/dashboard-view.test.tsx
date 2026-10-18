import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardView } from "../dashboard-view";

import { sampleDashboardData, auditResponse } from "./fixtures";

function repositories() {
  return within(screen.getByRole("region", { name: "Your repositories" }));
}

describe("DashboardView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the workspace heading, compact identity, summary, and repository list", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 1, name: "Repository overview" }),
    ).toBeDefined();
    expect(screen.getByRole("list", { name: "Repositories" })).toBeDefined();
    expect(repositories().getByText("alpha-repo")).toBeDefined();
    expect(repositories().getByText("beta-service")).toBeDefined();
    expect(repositories().getByText("gamma-cli")).toBeDefined();
  });

  it("filters repositories by search text", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const searchInput = screen.getByPlaceholderText(/search repositories/i);
    fireEvent.change(searchInput, { target: { value: "microservice" } });

    expect(repositories().queryByText("alpha-repo")).toBeNull();
    expect(repositories().getByText("beta-service")).toBeDefined();
    expect(repositories().queryByText("gamma-cli")).toBeNull();
  });

  it("filters repositories by audit status tabs", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    // Click "Needs Audit"
    const unauditedTab = screen.getByRole("button", { name: /^needs audit$/i });
    fireEvent.click(unauditedTab);

    expect(repositories().queryByText("alpha-repo")).toBeNull();
    expect(repositories().getByText("beta-service")).toBeDefined();
    expect(repositories().queryByText("gamma-cli")).toBeNull();

    // Click "Audited"
    const auditedTab = screen.getByRole("button", { name: /^audited$/i });
    fireEvent.click(auditedTab);

    expect(repositories().getByText("alpha-repo")).toBeDefined();
    expect(repositories().queryByText("beta-service")).toBeNull();
    expect(repositories().getByText("gamma-cli")).toBeDefined();
  });

  it("filters repositories by language dropdown", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const langSelect = screen.getByLabelText(/filter by language/i);
    fireEvent.change(langSelect, { target: { value: "Go" } });

    expect(repositories().queryByText("alpha-repo")).toBeNull();
    expect(repositories().queryByText("beta-service")).toBeNull();
    expect(repositories().getByText("gamma-cli")).toBeDefined();
  });

  it("sorts repositories by star count and health score", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const sortSelect = screen.getByLabelText(/sort repositories/i);
    fireEvent.change(sortSelect, { target: { value: "stars" } });

    const cardTitles = repositories().getAllByRole("link", {
      name: /-(repo|service|cli)/i,
    });
    expect(cardTitles[0].textContent).toContain("beta-service"); // 200 stars
  });

  it("displays empty state and allows clearing filters when no repositories match", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const searchInput = screen.getByPlaceholderText(/search repositories/i);
    fireEvent.change(searchInput, { target: { value: "non-existent-xyz" } });

    expect(screen.getByText(/no repositories found/i)).toBeDefined();

    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(repositories().getByText("alpha-repo")).toBeDefined();
  });

  it("keeps portfolio statistics unchanged when filtering the list", () => {
    render(<DashboardView initialData={sampleDashboardData} />);
    fireEvent.click(screen.getByRole("button", { name: /^needs audit$/i }));
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "67",
    );
    expect(screen.getByText("75")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: /^needs audit$/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Showing 1 repository")).toBeDefined();
  });

  it("updates coverage, average health, and filtered results after an audit", async () => {
    const report = {
      owner: "octocat",
      repo: "beta-service",
      shareId: "betashr1",
      defaultBranch: "main",
      rubricVersion: "1.0.0",
      generatedAt: "2026-10-18T10:00:00Z",
      healthScore: 90,
      checks: [
        {
          id: "readme",
          name: "README",
          category: "documentation",
          pointsAwarded: 90,
          maxPoints: 90,
          passed: true,
          evidence: {
            filesChecked: ["README.md"],
            found: true,
            details: "README exists",
          },
        },
      ],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(report), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    render(
      <DashboardView initialData={sampleDashboardData} fetcher={fetcher} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^needs audit$/i }));
    fireEvent.click(screen.getByRole("button", { name: /audit repository/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("progressbar").getAttribute("aria-valuenow"),
      ).toBe("100"),
    );
    const summary = screen.getByRole("region", {
      name: "Repository audit summary",
    });
    expect(within(summary).getByText("80")).toBeDefined();
    expect(screen.getByText("Showing 0 repositories")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    const beta = screen.getByRole("article", {
      name: "Repository octocat/beta-service",
    });
    expect(
      within(beta).getByRole("link", { name: /view report/i }),
    ).toBeDefined();
    expect(within(beta).getByRole("meter").getAttribute("aria-valuenow")).toBe(
      "90",
    );
  });

  it("offers a next step for accounts without repositories", () => {
    render(
      <DashboardView
        initialData={{ ...sampleDashboardData, repositories: [] }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Your repositories start here" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "Open GitHub profile" })
        .getAttribute("href"),
    ).toBe(sampleDashboardData.user.githubUrl);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "0",
    );
    expect(screen.getByText("Run an audit to see your score")).toBeDefined();
  });

  it("preserves all sort orders and combines search, status, and language filters", () => {
    render(<DashboardView initialData={sampleDashboardData} />);
    const names = () =>
      within(screen.getByRole("list", { name: "Repositories" }))
        .getAllByRole("article")
        .map((row) => row.getAttribute("aria-label"));
    expect(names()[0]).toBe("Repository octocat/beta-service");
    fireEvent.change(screen.getByLabelText(/sort repositories/i), {
      target: { value: "score" },
    });
    expect(names()).toEqual([
      "Repository octocat/alpha-repo",
      "Repository octocat/gamma-cli",
      "Repository octocat/beta-service",
    ]);
    fireEvent.change(screen.getByLabelText(/sort repositories/i), {
      target: { value: "name" },
    });
    expect(names()).toEqual([
      "Repository octocat/alpha-repo",
      "Repository octocat/beta-service",
      "Repository octocat/gamma-cli",
    ]);
    fireEvent.change(screen.getByLabelText(/search repositories/i), {
      target: { value: "tool" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^audited$/i }));
    fireEvent.change(screen.getByLabelText(/filter by language/i), {
      target: { value: "Go" },
    });
    expect(names()).toEqual(["Repository octocat/gamma-cli"]);
  });
  it("clears conflicting filters and focuses results when reviewing unaudited repositories", () => {
    render(<DashboardView initialData={sampleDashboardData} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alpha" } });
    fireEvent.change(screen.getByLabelText(/filter by language/i), { target: { value: "Go" } });
    fireEvent.click(screen.getByRole("button", { name: "Review unaudited repositories" }));
    expect(repositories().getByText("beta-service")).toBeDefined();
    expect(repositories().queryByText("alpha-repo")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Your repositories" }));
    expect(screen.getByRole("searchbox").getAttribute("value")).toBe("");
  });

  it("shows full-collection insights and filter counts while the list is filtered", () => {
    render(<DashboardView initialData={sampleDashboardData} />);
    fireEvent.click(screen.getByRole("button", { name: "Needs audit" }));
    const insights = within(screen.getByRole("complementary"));
    expect(insights.getByText("Across 3 loaded repositories")).toBeDefined();
    expect(insights.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/report/octocat/gamma-cli", "/report/octocat/alpha-repo",
    ]);
    expect(screen.getByRole("button", { name: "All repositories" }).textContent).toBe("All repositories3");
  });

  it("keeps pending state and prevents duplicate requests when a repository is filtered out and back", async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    render(<DashboardView initialData={sampleDashboardData} fetcher={fetcher} />);
    fireEvent.click(screen.getByRole("button", { name: "Audit repository" }));
    fireEvent.click(screen.getByRole("button", { name: "Audited" }));
    expect(repositories().queryByText("beta-service")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "All repositories" }));
    const pendingButton = screen.getByRole("button", { name: "Auditing…" });
    expect(pendingButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(pendingButton);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Audited" }));
    finish(auditResponse(sampleDashboardData.repositories[1], 95));
    await waitFor(() => expect(repositories().getByText("beta-service")).toBeDefined());
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    const latest = within(screen.getByRole("complementary")).getAllByRole("link");
    expect(latest[0].getAttribute("href")).toBe("/report/octocat/beta-service");
    expect(latest[0].querySelector("time")?.getAttribute("datetime")).toBe("2026-10-18T10:00:00Z");
  });

  it("handles independent concurrent audits and preserves scores on failure before retry", async () => {
    const pending: Array<(response: Response) => void> = [];
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve)));
    render(<DashboardView initialData={sampleDashboardData} fetcher={fetcher} />);
    const alpha = within(screen.getByRole("article", { name: "Repository octocat/alpha-repo" }));
    const beta = within(screen.getByRole("article", { name: "Repository octocat/beta-service" }));
    fireEvent.click(alpha.getByRole("button", { name: "Re-audit" }));
    fireEvent.click(beta.getByRole("button", { name: "Audit repository" }));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("button", { name: "Auditing…" })).toHaveLength(2);
    pending[0](new Response(JSON.stringify({ error: "GitHub rate limit exceeded. Try again later." }), { status: 429 }));
    pending[1](auditResponse(sampleDashboardData.repositories[1], 80));
    await waitFor(() => expect(alpha.getByRole("button", { name: "Retry audit" })).toBeDefined());
    await waitFor(() => expect(beta.getByRole("meter").getAttribute("aria-valuenow")).toBe("80"));
    expect(alpha.getByRole("meter").getAttribute("aria-valuenow")).toBe("90");
    expect(alpha.getByRole("link", { name: "View report" })).toBeDefined();
    fireEvent.click(alpha.getByRole("button", { name: "Retry audit" }));
    pending[2](auditResponse(sampleDashboardData.repositories[0], 100));
    await waitFor(() => expect(alpha.getByRole("meter").getAttribute("aria-valuenow")).toBe("100"));
    expect(alpha.queryByRole("alert")).toBeNull();
  });

});
