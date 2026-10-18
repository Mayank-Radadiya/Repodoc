import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardRepoCard } from "../dashboard-repo-card";
import type { DashboardRepoItem } from "@/lib/dashboard";

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
    render(<DashboardRepoCard repo={sampleUnauditedRepo} onAudit={vi.fn()} />);

    expect(screen.getByText("super-app")).toBeDefined();
    expect(
      screen.getByText("A super awesome Next.js web application"),
    ).toBeDefined();
    expect(screen.getByText("TypeScript")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("Not audited yet")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /audit repository/i }),
    ).toBeDefined();
  });

  it("renders audited repository score badge and view report link", () => {
    render(<DashboardRepoCard repo={sampleAuditedRepo} onAudit={vi.fn()} />);

    expect(screen.getByText("documented-lib")).toBeDefined();
    expect(
      screen.getByRole("meter", { name: /health score for documented-lib/i }),
    ).toBeDefined();
    const viewLink = screen.getByRole("link", { name: /view report/i });
    expect(viewLink.getAttribute("href")).toBe(
      "/report/octocat/documented-lib",
    );
    expect(screen.getByRole("button", { name: /re-audit/i })).toBeDefined();
  });

  it("sends the selected repository to the audit handler and reflects pending state", () => {
    const onAudit = vi.fn();
    const { rerender } = render(<DashboardRepoCard repo={sampleUnauditedRepo} onAudit={onAudit} />);
    fireEvent.click(screen.getByRole("button", { name: /audit repository/i }));
    expect(onAudit).toHaveBeenCalledWith(sampleUnauditedRepo);
    rerender(<DashboardRepoCard repo={sampleUnauditedRepo} onAudit={onAudit} auditState={{ pending: true, error: null }} />);
    expect(screen.getByRole("button", { name: /auditing/i }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps the saved report and score accessible on failure and provides retry", () => {
    const onAudit = vi.fn();
    render(<DashboardRepoCard repo={sampleAuditedRepo} onAudit={onAudit} auditState={{ pending: false, error: "GitHub rate limit exceeded. Try again later." }} />);
    expect(screen.getByRole("alert").textContent).toContain("GitHub rate limit exceeded");
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("88");
    expect(screen.getByRole("link", { name: /view report/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /retry audit/i }));
    expect(onAudit).toHaveBeenCalledWith(sampleAuditedRepo);
  });

  it("keeps report access available when the saved score is missing", () => {
    render(
      <DashboardRepoCard
        onAudit={vi.fn()}
        repo={{ ...sampleAuditedRepo, healthScore: null, lastAuditedAt: null }}
      />,
    );
    expect(screen.getByText("Score unavailable")).toBeDefined();
    expect(screen.getByText("Date unavailable")).toBeDefined();
    expect(
      screen.getByRole("link", { name: /view report/i }).getAttribute("href"),
    ).toBe("/report/octocat/documented-lib");
    expect(screen.getByRole("button", { name: /re-audit/i })).toBeDefined();
  });

  it("shows a zero health score and handles invalid audit dates", () => {
    render(
      <DashboardRepoCard
        onAudit={vi.fn()}
        repo={{
          ...sampleAuditedRepo,
          healthScore: 0,
          lastAuditedAt: "invalid-date",
          description: null,
          language: null,
        }}
      />,
    );
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("Critical")).toBeDefined();
    expect(screen.getByText("Date unavailable")).toBeDefined();
    expect(screen.getByText("No description provided.")).toBeDefined();
  });
});
