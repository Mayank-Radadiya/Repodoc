import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardRepoCard } from "../dashboard-repo-card";
import type { DashboardRepoItem } from "@/src/lib/dashboard";

const sampleUnauditedRepo: DashboardRepoItem = {
  id: 1,
  name: "super-app",
  fullName: "octocat/super-app",
  owner: "octocat",
  description: "A super awesome Next.js web application",
  isPrivate: false,
  language: "TypeScript",
  starsCount: 42,
  forksCount: 5,
  defaultBranch: "main",
  updatedAt: "2026-10-15T12:00:00Z",
  githubUrl: "https://github.com/octocat/super-app",
  hasReport: false,
  healthScore: null,
  shareId: null,
  lastAuditedAt: null,
};

const sampleAuditedRepo: DashboardRepoItem = {
  ...sampleUnauditedRepo,
  id: 2,
  name: "documented-lib",
  fullName: "octocat/documented-lib",
  hasReport: true,
  healthScore: 88,
  shareId: "share999",
  lastAuditedAt: "2026-10-16T10:00:00Z",
};

describe("DashboardRepoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders unaudited repository metadata and audit action button", () => {
    render(<DashboardRepoCard repo={sampleUnauditedRepo} />);

    expect(screen.getByText("super-app")).toBeDefined();
    expect(screen.getByText("A super awesome Next.js web application")).toBeDefined();
    expect(screen.getByText("TypeScript")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("Not audited yet")).toBeDefined();
    expect(screen.getByRole("button", { name: /audit repository/i })).toBeDefined();
  });

  it("renders audited repository score badge and view report link", () => {
    render(<DashboardRepoCard repo={sampleAuditedRepo} />);

    expect(screen.getByText("documented-lib")).toBeDefined();
    expect(screen.getByText("88/100")).toBeDefined();
    const viewLink = screen.getByRole("link", { name: /view report/i });
    expect(viewLink.getAttribute("href")).toBe("/report/octocat/documented-lib");
    expect(screen.getByRole("button", { name: /re-audit/i })).toBeDefined();
  });

  it("triggers audit on click, shows loading state, and calls onAuditComplete on success", async () => {
    const onAuditComplete = vi.fn();
    const mockFetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          owner: "octocat",
          repo: "super-app",
          defaultBranch: "main",
          healthScore: 95,
          rubricVersion: "1.0.0",
          shareId: "share123",
          checks: [
            {
              id: "readme",
              name: "README",
              category: "documentation",
              pointsAwarded: 95,
              maxPoints: 95,
              passed: true,
              evidence: {
                filesChecked: ["README.md"],
                found: true,
                details: "README exists",
              },
            },
          ],
          generatedAt: "2026-10-18T10:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <DashboardRepoCard
        repo={sampleUnauditedRepo}
        onAuditComplete={onAuditComplete}
        fetcher={mockFetcher}
      />,
    );

    const auditBtn = screen.getByRole("button", { name: /audit repository/i });
    fireEvent.click(auditBtn);

    // Shows loading state
    expect(screen.getByText(/auditing/i)).toBeDefined();

    await waitFor(() => {
      expect(onAuditComplete).toHaveBeenCalledTimes(1);
    });

    expect(onAuditComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: "super-app",
        hasReport: true,
        healthScore: 95,
        shareId: "share123",
      }),
    );
  });

  it("displays error message when audit fails and permits retry", async () => {
    const mockFetcher = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "GitHub rate limit exceeded. Try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <DashboardRepoCard
        repo={sampleUnauditedRepo}
        fetcher={mockFetcher}
      />,
    );

    const auditBtn = screen.getByRole("button", { name: /audit repository/i });
    fireEvent.click(auditBtn);

    await waitFor(() => {
      expect(screen.getByText(/GitHub rate limit exceeded/i)).toBeDefined();
    });

    // Button should be active again to allow retry
    expect(screen.getByRole("button", { name: /audit repository/i })).toBeDefined();
  });
});
