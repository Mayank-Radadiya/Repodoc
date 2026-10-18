import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardProfileCard } from "../dashboard-profile-card";
import type { UserProfileData } from "@/lib/dashboard";

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

describe("DashboardProfileCard", () => {
  afterEach(cleanup);

  it("renders compact identity and links to the GitHub profile", () => {
    render(<DashboardProfileCard user={sampleUser} />);
    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: /view github profile/i })
        .getAttribute("href"),
    ).toBe(sampleUser.githubUrl);
    expect(screen.queryByText(sampleUser.bio!)).toBeNull();
    expect(screen.queryByText("5,280")).toBeNull();
  });

  it("uses the username when profile details are missing", () => {
    render(
      <DashboardProfileCard
        user={{
          ...sampleUser,
          name: null,
          bio: null,
          company: null,
          location: null,
          website: null,
        }}
      />,
    );
    expect(screen.getByText("octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /view github profile for octocat/i }),
    ).toBeDefined();
  });
});
