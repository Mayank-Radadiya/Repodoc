import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { ScoringEngine } from "@/lib/scoring/engine";
import { ReportController } from "../report-controller";
import { ShareController } from "../share-controller";
import { renderSignedOut as render } from "@/components/auth/__tests__/fixtures";

const savedReport = {
  ...ScoringEngine.run({
    owner: "octocat",
    repo: "Hello-World",
    defaultBranch: "master",
    paths: new Set(["README.md", "LICENSE"]),
    generatedAt: "2026-10-14T10:00:00.000Z",
  }),
  shareId: "octo1234",
};

const copy = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  copy.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
});

afterEach(() => {
  cleanup();
});

describe("audit page to shareable report flow", () => {
  it("audit page displays share link which links to read-only report", async () => {
    // 1. Render audit page with scored report
    const { unmount } = render(
      <ReportController
        owner="octocat"
        repo="Hello-World"
        initialReport={savedReport}
      />,
    );

    // Audit page has Re-audit button
    expect(screen.getByRole("button", { name: "Re-audit" })).toBeDefined();

    // Audit page provides share link targeting /share/[shareId]
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    const shareLink = await screen.findByRole("menuitem", {
      name: "Share link",
    });
    expect(shareLink.getAttribute("href")).toBe("/share/octo1234");

    unmount();

    // 2. Open the shareable read-only report at /share/octo1234
    render(<ShareController shareId="octo1234" initialReport={savedReport} />);

    // Read-only report displays identical score and category breakdown
    expect(
      screen.getByRole("heading", { name: "octocat/Hello-World" }),
    ).toBeDefined();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
      String(savedReport.healthScore),
    );
    expect(screen.getByText("Shared snapshot (read-only)")).toBeDefined();

    // Read-only report MUST NOT have a Re-audit button
    expect(screen.queryByRole("button", { name: /re-audit/i })).toBeNull();

    // Read-only report allows copying the share link
    const copyShareButton = screen.getByRole("button", {
      name: "Copy share link",
    });
    await waitFor(() =>
      expect(copyShareButton.hasAttribute("disabled")).toBe(false),
    );
    fireEvent.click(copyShareButton);
    await screen.findByRole("button", { name: "Link copied" });
    expect(copy).toHaveBeenLastCalledWith(
      `${window.location.origin}/share/octo1234`,
    );

    // Read-only report allows navigating back to the live audit report
    const liveLink = screen.getByRole("link", { name: /view live report/i });
    expect(liveLink.getAttribute("href")).toBe("/report/octocat/Hello-World");
  });
});
