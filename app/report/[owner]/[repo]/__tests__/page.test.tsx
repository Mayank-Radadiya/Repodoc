import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScoringEngine } from "@/lib/scoring/engine";
import { findReportByRepository } from "@/lib/reports";
import Page, { generateMetadata } from "../page";
import ReportError from "../error";
import ReportNotFound from "../not-found";

vi.mock("@/lib/reports", () => ({ findReportByRepository: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
const lookup = vi.mocked(findReportByRepository);
const report = {
  ...ScoringEngine.run({ owner: "Owner", repo: "Repo", paths: new Set() }),
  shareId: "test1234",
};

beforeEach(() => lookup.mockReset());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("live report metadata", () => {
  it("identifies an unaudited repository without database or network requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const metadata = await generateMetadata({
      params: Promise.resolve({ owner: "Owner", repo: "repo.name-1" }),
    });
    expect(metadata.title).toEqual({
      absolute: "Repodoc — Owner/repo.name-1 Health Report",
    });
    expect(metadata.description).toContain("Owner/repo.name-1");
    expect(metadata.alternates?.canonical).toBe(
      "https://repodoc.dev/report/Owner/repo.name-1",
    );
    expect(metadata.openGraph).toMatchObject({
      title: "Repodoc — Owner/repo.name-1 Health Report",
      url: "https://repodoc.dev/report/Owner/repo.name-1",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(lookup).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { owner: "bad_owner", repo: "repo" },
    { owner: "owner", repo: ".." },
    { owner: "owner", repo: "bad/repo" },
  ])("rejects invalid metadata coordinates: %j", async (coordinates) => {
    await expect(
      generateMetadata({ params: Promise.resolve(coordinates) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("report server route", () => {
  it("awaits route coordinates and passes the saved report to the controller", async () => {
    lookup.mockResolvedValue(report);
    const page = await Page({
      params: Promise.resolve({ owner: "Owner", repo: "Repo" }),
    });
    expect(lookup).toHaveBeenCalledWith("Owner", "Repo");
    expect(page.props.initialReport).toEqual(report);
  });

  it("passes absent reports to the client for the first audit", async () => {
    lookup.mockResolvedValue(null);
    const page = await Page({
      params: Promise.resolve({ owner: "Owner", repo: "Repo" }),
    });
    expect(page.props.initialReport).toBeNull();
  });

  it.each([
    { owner: "bad_owner", repo: "repo" },
    { owner: "owner", repo: ".." },
    { owner: "owner", repo: "bad/repo" },
  ])(
    "rejects invalid route coordinates before querying: %j",
    async (coordinates) => {
      await expect(
        Page({ params: Promise.resolve(coordinates) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("propagates storage failures to the route error boundary rather than starting an audit", async () => {
    const failure = new Error("Database unavailable");
    lookup.mockRejectedValueOnce(failure);
    let caught: unknown;
    try {
      await Page({ params: Promise.resolve({ owner: "Owner", repo: "Repo" }) });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
  });

  it("offers a safe server retry and a way out of an invalid address", () => {
    const retry = vi.fn();
    const { unmount } = render(<ReportError retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try loading again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).not.toContain(
      "Database unavailable",
    );
    unmount();
    render(<ReportNotFound />);
    expect(
      screen
        .getByRole("link", { name: "Audit a repository" })
        .getAttribute("href"),
    ).toBe("/#hero");
  });
});
