// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import { getGitHubSession } from "@/lib/auth";
import { getDashboardData } from "@/src/lib/dashboard";
import DashboardPage from "../page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getGitHubSession: vi.fn(),
}));

vi.mock("@/src/lib/dashboard", () => ({
  getDashboardData: vi.fn(),
}));

// Mock DashboardView to inspect passed props
vi.mock("@/components/dashboard", () => ({
  DashboardView: (props: unknown) => ({ type: "DashboardView", props }),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    vi.mocked(getGitHubSession).mockResolvedValueOnce(null);

    await DashboardPage();

    expect(redirect).toHaveBeenCalledWith("/api/auth/signin?callbackUrl=/dashboard");
  });

  it("loads dashboard data and renders DashboardView for authenticated users", async () => {
    vi.mocked(getGitHubSession).mockResolvedValueOnce({
      userId: "u-1",
      githubId: "12345",
      username: "octocat",
      accessToken: "token-abc",
    });

    const mockData = {
      user: {
        username: "octocat",
        name: "Octocat",
        avatarUrl: "https://example.com/avatar.png",
        bio: null,
        location: null,
        company: null,
        website: null,
        publicReposCount: 1,
        followersCount: 10,
        followingCount: 2,
        githubUrl: "https://github.com/octocat",
        joinedAt: "2020-01-01T00:00:00Z",
      },
      repositories: [],
      stats: {
        totalRepos: 0,
        auditedCount: 0,
        unauditedCount: 0,
        averageScore: null,
      },
    };

    vi.mocked(getDashboardData).mockResolvedValueOnce(mockData);

    const result = await DashboardPage();

    expect(getDashboardData).toHaveBeenCalledWith("token-abc", "octocat");
    expect(result).toBeDefined();
  });
});
