import React, { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ScoringEngine } from "@/src/lib/scoring/engine";
import { ReportController } from "../report-controller";
import { buildMarkdownSnippet } from "../badge-snippet";

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
const refreshed = {
  ...ScoringEngine.run({
    owner: "Owner",
    repo: "Repo",
    defaultBranch: "main",
    paths: new Set(["LICENSE", ".gitignore"]),
    generatedAt: "2026-10-14T12:00:00.000Z",
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

function show(initialReport: typeof saved | null = saved) {
  return render(
    <ReportController
      owner="Owner"
      repo="Repo"
      initialReport={initialReport}
    />,
  );
}

describe("report controller and composed report view", () => {
  it("shows a saved report, metadata, and expandable evidence without another audit", async () => {
    show();
    expect(screen.getByRole("heading", { name: "Owner/Repo" })).toBeDefined();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
      String(saved.healthScore),
    );
    expect(screen.getByText(/Oct 13, 2026/)).toBeDefined();
    expect(screen.getByText("main")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: /Evidence and remediation for README/i }),
    );
    expect(await screen.findByText("Files checked")).toBeDefined();
    await screen.findByRole("button", { name: /copy markdown/i });
    expect(
      screen.getByRole("link", { name: /share link/i }).getAttribute("href"),
    ).toBe(`/share/${saved.shareId}`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("audits a missing report once, including under Strict Mode", async () => {
    fetchMock.mockResolvedValue(Response.json(saved));
    render(
      <StrictMode>
        <ReportController owner="Owner" repo="Repo" initialReport={null} />
      </StrictMode>,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Auditing Owner/Repo",
    );
    await screen.findByRole("heading", { name: "Owner/Repo" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates the report after Re-audit and prevents duplicate submissions", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    show();
    const button = screen.getByRole("button", { name: "Re-audit" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => resolve(Response.json(refreshed)));
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
      String(refreshed.healthScore),
    );
    expect(screen.getByText(/Oct 14, 2026/)).toBeDefined();
  });

  it.each([404, 429, 502])(
    "keeps the saved report visible when refreshing fails with %i",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json(
          { error: "GitHub is unavailable. Try again later." },
          { status },
        ),
      );
      show();
      fireEvent.click(screen.getByRole("button", { name: "Re-audit" }));
      expect((await screen.findByRole("alert")).textContent).toContain(
        "The previous report is still shown.",
      );
      expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(
        String(saved.healthScore),
      );
      expect(
        screen
          .getByRole("button", { name: "Re-audit" })
          .hasAttribute("disabled"),
      ).toBe(false);
    },
  );

  it("allows retry after a failed initial audit", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce(Response.json(saved));
    show(null);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Network unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try audit again" }));
    await screen.findByRole("heading", { name: "Owner/Repo" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("copies the report URL and badge with the current deployment origin", async () => {
    show();
    const share = screen.getByRole("button", { name: "Copy report link" });
    await waitFor(() => expect(share.hasAttribute("disabled")).toBe(false));
    fireEvent.click(share);
    await screen.findByRole("button", { name: "Link copied" });
    expect(copy).toHaveBeenLastCalledWith(
      `${window.location.origin}/report/Owner/Repo`,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy markdown/i }));
    await waitFor(() =>
      expect(copy).toHaveBeenLastCalledWith(
        buildMarkdownSnippet({
          owner: "Owner",
          repo: "Repo",
          baseUrl: window.location.origin,
        }),
      ),
    );
  });

  it("provides manual-copy recovery after clipboard failure", async () => {
    copy.mockRejectedValue(new Error("Permission denied"));
    show();
    const share = screen.getByRole("button", { name: "Copy report link" });
    await waitFor(() => expect(share.hasAttribute("disabled")).toBe(false));
    fireEvent.click(share);
    const input = await screen.findByRole<HTMLInputElement>("textbox", {
      name: "Copy the report link manually",
    });
    expect(input.value).toBe(`${window.location.origin}/report/Owner/Repo`);
    expect(input.readOnly).toBe(true);
  });

  it("aborts requests and ignores a late response after repository navigation", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockReturnValue(
      new Promise<Response>((done) => {
        resolve = done;
      }),
    );
    const { rerender } = show(null);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const signal = fetchMock.mock.calls[0][1]?.signal;
    const other = { ...saved, owner: "Other", repo: "Project" };
    rerender(
      <ReportController owner="Other" repo="Project" initialReport={other} />,
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json(saved)));
    expect(
      screen.getByRole("heading", { name: "Other/Project" }),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Owner/Repo" })).toBeNull();
  });
});
