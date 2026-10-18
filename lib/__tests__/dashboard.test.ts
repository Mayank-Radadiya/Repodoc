// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboardData } from "../dashboard";

vi.mock("@/lib/db", () => ({
  prisma: {
    repoReport: {
      findMany: vi.fn(),
    },
  },
}));

const fetchMock = vi.fn<typeof fetch>();

const sampleUserResponse = {
  login: "octocat",
  name: "The Octocat",
  avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
  bio: "Open source enthusiast and GitHub mascot.",
  location: "San Francisco",
  company: "@github",
  blog: "https://github.blog",
  public_repos: 8,
  followers: 4200,
  following: 9,
  html_url: "https://github.com/octocat",
  created_at: "2011-01-25T18:44:36Z",
};

const sampleReposResponse = [
  {
    id: 101,
    name: "hello-world",
    full_name: "octocat/hello-world",
    owner: { login: "octocat" },
    private: false,
    description: "My first repository on GitHub!",
    stargazers_count: 1500,
    forks_count: 800,
    language: "TypeScript",
    default_branch: "main",
    updated_at: "2026-10-15T12:00:00Z",
    html_url: "https://github.com/octocat/hello-world",
  },
  {
    id: 102,
    name: "spoon-knife",
    full_name: "octocat/spoon-knife",
    owner: { login: "octocat" },
    private: false,
    description: "A repository for forking practice",
    stargazers_count: 120,
    forks_count: 45,
    language: "HTML",
    default_branch: "master",
    updated_at: "2026-09-20T08:30:00Z",
    html_url: "https://github.com/octocat/spoon-knife",
  },
  {
    id: 103,
    name: "secret-lab",
    full_name: "octocat/secret-lab",
    owner: { login: "octocat" },
    private: true,
    description: null,
    stargazers_count: 3,
    forks_count: 0,
    language: null,
    default_branch: "main",
    updated_at: "2026-10-18T05:00:00Z",
    html_url: "https://github.com/octocat/secret-lab",
  },
];

describe("getDashboardData", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(prisma.repoReport.findMany).mockReset().mockResolvedValue([]);
  });

  it("fetches user profile and repos, joins Prisma reports, and computes summary statistics", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return Response.json(sampleUserResponse);
      }
      if (url.includes("/user/repos")) {
        return Response.json(sampleReposResponse);
      }
      return new Response("Not found", { status: 404 });
    });

    vi.mocked(prisma.repoReport.findMany).mockResolvedValueOnce([
      {
        id: "rep-1",
        shareId: "share123",
        owner: "octocat",
        repo: "hello-world",
        defaultBranch: "main",
        healthScore: 92,
        rubricVersion: "1.0.0",
        breakdown: {},
        etag: "etag-1",
        userId: null,
        createdAt: new Date("2026-10-16T10:00:00Z"),
        updatedAt: new Date("2026-10-16T10:00:00Z"),
      },
    ]);

    const data = await getDashboardData("mock-token", "octocat");

    // Check user data
    expect(data.user).toEqual({
      username: "octocat",
      name: "The Octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      bio: "Open source enthusiast and GitHub mascot.",
      location: "San Francisco",
      company: "@github",
      website: "https://github.blog",
      publicReposCount: 8,
      followersCount: 4200,
      followingCount: 9,
      githubUrl: "https://github.com/octocat",
      joinedAt: "2011-01-25T18:44:36Z",
    });

    // Check repositories
    expect(data.repositories).toHaveLength(3);
    const helloWorld = data.repositories.find((r) => r.name === "hello-world");
    expect(helloWorld).toMatchObject({
      name: "hello-world",
      owner: "octocat",
      hasReport: true,
      healthScore: 92,
      shareId: "share123",
      language: "TypeScript",
      starsCount: 1500,
    });

    const spoonKnife = data.repositories.find((r) => r.name === "spoon-knife");
    expect(spoonKnife).toMatchObject({
      name: "spoon-knife",
      owner: "octocat",
      hasReport: false,
      healthScore: null,
      shareId: null,
      language: "HTML",
    });

    // Check aggregate stats
    expect(data.stats).toEqual({
      totalRepos: 3,
      auditedCount: 1,
      unauditedCount: 2,
      averageScore: 92,
    });
  });

  it("handles null/missing optional fields and empty repos gracefully", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/user")) {
        return Response.json({
          login: "ghost",
          avatar_url: "https://avatars.githubusercontent.com/u/101?v=4",
          html_url: "https://github.com/ghost",
          created_at: "2020-01-01T00:00:00Z",
        });
      }
      if (url.includes("/user/repos")) {
        return Response.json([]);
      }
      return new Response("Not found", { status: 404 });
    });

    const data = await getDashboardData("mock-token", "ghost");

    expect(data.user).toEqual({
      username: "ghost",
      name: null,
      avatarUrl: "https://avatars.githubusercontent.com/u/101?v=4",
      bio: null,
      location: null,
      company: null,
      website: null,
      publicReposCount: 0,
      followersCount: 0,
      followingCount: 0,
      githubUrl: "https://github.com/ghost",
      joinedAt: "2020-01-01T00:00:00Z",
    });
    expect(data.repositories).toEqual([]);
    expect(data.stats).toEqual({
      totalRepos: 0,
      auditedCount: 0,
      unauditedCount: 0,
      averageScore: null,
    });
  });

  it("throws sanitized error when GitHub API request fails", async () => {
    fetchMock.mockImplementation(async () => {
      return new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });

    await expect(getDashboardData("bad-token", "octocat")).rejects.toThrow();
  });
});
