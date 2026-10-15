import React, { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import { ShareController } from "../share-controller";

const saved = {
  ...ScoringEngine.run({
    owner: "Owner",
    repo: "Repo",
    defaultBranch: "main",
    paths: new Set(["LICENSE"]),
    generatedAt: "2026-10-13T12:00:00.000Z",
  }),
  shareId: "test1234",
};

const fetchMock = vi.fn<typeof fetch>();
const copy = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  fetchMock.mockReset();
  copy.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ShareController", () => {
  it("renders the report in read-only mode without any re-audit button", async () => {
    render(<ShareController shareId="test1234" initialReport={saved} />);

    // Repository heading, metadata and score
    expect(screen.getByRole("heading", { name: "Owner/Repo" })).toBeDefined();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
      String(saved.healthScore),
    );
    expect(screen.getByText("Shared snapshot (read-only)")).toBeDefined();

    // STRICT REQUIREMENT: No Re-audit button
    expect(
      screen.queryByRole("button", { name: /re-audit/i }),
    ).toBeNull();

    // Category breakdown and expandable evidence are present
    fireEvent.click(
      screen.getByRole("button", { name: /Evidence for README/i }),
    );
    expect(await screen.findByText("Files checked")).toBeDefined();

    // Badge snippet is present
    await screen.findByRole("button", { name: /copy markdown/i });

    // No network requests were made since initialReport was provided
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("provides a View live report link pointing to /report/owner/repo", async () => {
    render(<ShareController shareId="test1234" initialReport={saved} />);
    const liveLink = await screen.findByRole("link", {
      name: /view live report/i,
    });
    expect(liveLink.getAttribute("href")).toBe("/report/Owner/Repo");
  });

  it("copies the share link to clipboard with deployment origin", async () => {
    render(<ShareController shareId="test1234" initialReport={saved} />);
    const shareButton = screen.getByRole("button", { name: "Copy share link" });
    await waitFor(() => expect(shareButton.hasAttribute("disabled")).toBe(false));

    fireEvent.click(shareButton);
    await screen.findByRole("button", { name: "Link copied" });
    expect(copy).toHaveBeenLastCalledWith(
      `${window.location.origin}/share/test1234`,
    );
  });

  it("provides manual-copy recovery if clipboard write fails", async () => {
    copy.mockRejectedValue(new Error("Permission denied"));
    render(<ShareController shareId="test1234" initialReport={saved} />);
    const shareButton = screen.getByRole("button", { name: "Copy share link" });
    await waitFor(() => expect(shareButton.hasAttribute("disabled")).toBe(false));

    fireEvent.click(shareButton);
    const input = await screen.findByRole<HTMLInputElement>("textbox", {
      name: "Copy the share link manually",
    });
    expect(input.value).toBe(`${window.location.origin}/share/test1234`);
    expect(input.readOnly).toBe(true);
  });

  it("fetches from /api/report/[shareId] when initialReport is omitted, including under Strict Mode", async () => {
    fetchMock.mockResolvedValue(Response.json(saved));
    render(
      <StrictMode>
        <ShareController shareId="test1234" />
      </StrictMode>,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Loading shared report…",
    );
    await screen.findByRole("heading", { name: "Owner/Repo" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/report/test1234",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("handles fetch failure gracefully and allows retry", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ error: "Report not found." }, { status: 404 }),
      )
      .mockResolvedValueOnce(Response.json(saved));

    render(<ShareController shareId="test1234" />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Report not found.",
    );
    expect(
      screen.getByRole("heading", { name: "Unable to load this shared report" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Try loading again" }));
    await screen.findByRole("heading", { name: "Owner/Repo" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
