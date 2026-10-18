import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardProfileCard } from "../dashboard-profile-card";
import type { UserProfileData, DashboardData } from "@/src/lib/dashboard";

const sampleUser: UserProfileData = {
  username: "octocat",
  name: "The Octocat",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  bio: "GitHub mascot and passionate open source supporter.",
  location: "San Francisco, CA",
  company: "@github",
  website: "https://github.blog",
  publicReposCount: 12,
  followersCount: 5280,
  followingCount: 9,
  githubUrl: "https://github.com/octocat",
  joinedAt: "2011-01-25T18:44:36Z",
};

const sampleStats: DashboardData["stats"] = {
  totalRepos: 12,
  auditedCount: 8,
  unauditedCount: 4,
  averageScore: 89,
};

describe("DashboardProfileCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders user identity, metadata, and GitHub link", () => {
    render(<DashboardProfileCard user={sampleUser} stats={sampleStats} />);

    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(screen.getByText("GitHub mascot and passionate open source supporter.")).toBeDefined();
    expect(screen.getByText("San Francisco, CA")).toBeDefined();
    expect(screen.getByText("@github")).toBeDefined();
    expect(screen.getByText("https://github.blog")).toBeDefined();

    const ghLink = screen.getByRole("link", { name: /view github profile/i });
    expect(ghLink.getAttribute("href")).toBe("https://github.com/octocat");
  });

  it("renders metric cards with formatted counts and audit health summary", () => {
    render(<DashboardProfileCard user={sampleUser} stats={sampleStats} />);

    expect(screen.getByText("12")).toBeDefined();
    expect(screen.getByText("5,280")).toBeDefined();
    expect(screen.getByText("8 / 12")).toBeDefined();
    expect(screen.getByText("89/100")).toBeDefined();
  });

  it("handles null/missing optional fields and empty score gracefully", () => {
    const minimalUser: UserProfileData = {
      username: "coder",
      name: null,
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      bio: null,
      location: null,
      company: null,
      website: null,
      publicReposCount: 0,
      followersCount: 0,
      followingCount: 0,
      githubUrl: "https://github.com/coder",
      joinedAt: "2024-05-10T00:00:00Z",
    };

    const emptyStats: DashboardData["stats"] = {
      totalRepos: 0,
      auditedCount: 0,
      unauditedCount: 0,
      averageScore: null,
    };

    render(<DashboardProfileCard user={minimalUser} stats={emptyStats} />);

    expect(screen.getByText("@coder")).toBeDefined();
    expect(screen.getByText("No bio available")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined();
  });
});
