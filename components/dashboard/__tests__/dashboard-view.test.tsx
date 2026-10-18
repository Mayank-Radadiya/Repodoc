import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardView } from "../dashboard-view";
import type { DashboardData } from "@/src/lib/dashboard";

const sampleDashboardData: DashboardData = {
  user: {
    username: "octocat",
    name: "The Octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    bio: "Passionate coder",
    location: "San Francisco",
    company: "@github",
    website: "https://github.blog",
    publicReposCount: 3,
    followersCount: 100,
    followingCount: 10,
    githubUrl: "https://github.com/octocat",
    joinedAt: "2011-01-25T18:44:36Z",
  },
  repositories: [
    {
      id: 1,
      name: "alpha-repo",
      fullName: "octocat/alpha-repo",
      owner: "octocat",
      description: "Frontend react toolkit",
      isPrivate: false,
      language: "TypeScript",
      starsCount: 50,
      forksCount: 5,
      defaultBranch: "main",
      updatedAt: "2026-10-10T12:00:00Z",
      githubUrl: "https://github.com/octocat/alpha-repo",
      hasReport: true,
      healthScore: 90,
      shareId: "share-alpha",
      lastAuditedAt: "2026-10-10T12:00:00Z",
    },
    {
      id: 2,
      name: "beta-service",
      fullName: "octocat/beta-service",
      owner: "octocat",
      description: "Backend microservice in Python",
      isPrivate: false,
      language: "Python",
      starsCount: 200,
      forksCount: 15,
      defaultBranch: "main",
      updatedAt: "2026-10-15T12:00:00Z",
      githubUrl: "https://github.com/octocat/beta-service",
      hasReport: false,
      healthScore: null,
      shareId: null,
      lastAuditedAt: null,
    },
    {
      id: 3,
      name: "gamma-cli",
      fullName: "octocat/gamma-cli",
      owner: "octocat",
      description: "CLI utility tool",
      isPrivate: false,
      language: "Go",
      starsCount: 10,
      forksCount: 1,
      defaultBranch: "main",
      updatedAt: "2026-10-12T12:00:00Z",
      githubUrl: "https://github.com/octocat/gamma-cli",
      hasReport: true,
      healthScore: 60,
      shareId: "share-gamma",
      lastAuditedAt: "2026-10-12T12:00:00Z",
    },
  ],
  stats: {
    totalRepos: 3,
    auditedCount: 2,
    unauditedCount: 1,
    averageScore: 75,
  },
};

describe("DashboardView", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders profile summary, toolbar, and repository cards", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("alpha-repo")).toBeDefined();
    expect(screen.getByText("beta-service")).toBeDefined();
    expect(screen.getByText("gamma-cli")).toBeDefined();
  });

  it("filters repositories by search text", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const searchInput = screen.getByPlaceholderText(/search repositories/i);
    fireEvent.change(searchInput, { target: { value: "microservice" } });

    expect(screen.queryByText("alpha-repo")).toBeNull();
    expect(screen.getByText("beta-service")).toBeDefined();
    expect(screen.queryByText("gamma-cli")).toBeNull();
  });

  it("filters repositories by audit status tabs", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    // Click "Needs Audit"
    const unauditedTab = screen.getByRole("tab", { name: /^needs audit$/i });
    fireEvent.click(unauditedTab);

    expect(screen.queryByText("alpha-repo")).toBeNull();
    expect(screen.getByText("beta-service")).toBeDefined();
    expect(screen.queryByText("gamma-cli")).toBeNull();

    // Click "Audited"
    const auditedTab = screen.getByRole("tab", { name: /^audited$/i });
    fireEvent.click(auditedTab);

    expect(screen.getByText("alpha-repo")).toBeDefined();
    expect(screen.queryByText("beta-service")).toBeNull();
    expect(screen.getByText("gamma-cli")).toBeDefined();
  });

  it("filters repositories by language dropdown", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const langSelect = screen.getByLabelText(/filter by language/i);
    fireEvent.change(langSelect, { target: { value: "Go" } });

    expect(screen.queryByText("alpha-repo")).toBeNull();
    expect(screen.queryByText("beta-service")).toBeNull();
    expect(screen.getByText("gamma-cli")).toBeDefined();
  });

  it("sorts repositories by star count and health score", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const sortSelect = screen.getByLabelText(/sort repositories/i);
    fireEvent.change(sortSelect, { target: { value: "stars" } });

    const cardTitles = screen.getAllByRole("link", { name: /-(repo|service|cli)/i });
    expect(cardTitles[0].textContent).toContain("beta-service"); // 200 stars
  });

  it("displays empty state and allows clearing filters when no repositories match", () => {
    render(<DashboardView initialData={sampleDashboardData} />);

    const searchInput = screen.getByPlaceholderText(/search repositories/i);
    fireEvent.change(searchInput, { target: { value: "non-existent-xyz" } });

    expect(screen.getByText(/no repositories found/i)).toBeDefined();

    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText("alpha-repo")).toBeDefined();
  });
});
