import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ScoringEngine } from "@/lib/scoring/engine";
import { findReportByShareId } from "@/lib/reports";
import Page, { generateMetadata } from "../page";
import ShareError from "../error";
import ShareNotFound from "../not-found";

vi.mock("@/lib/reports", () => ({ findReportByShareId: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const lookup = vi.mocked(findReportByShareId);
const report = {
  ...ScoringEngine.run({ owner: "Owner", repo: "Repo", paths: new Set() }),
  shareId: "test1234",
};

beforeEach(() => lookup.mockReset());
afterEach(cleanup);

describe("shared report metadata", () => {
  it("uses the stored repository name and the share URL", async () => {
    lookup.mockResolvedValue(report);
    const metadata = await generateMetadata({
      params: Promise.resolve({ shareId: "test1234" }),
    });
    expect(lookup).toHaveBeenCalledWith("test1234");
    expect(metadata.title).toEqual({
      absolute: "Repodoc — Owner/Repo Health Report",
    });
    expect(metadata.description).toContain("Owner/Repo");
    expect(metadata.alternates?.canonical).toBe(
      "https://repodoc.dev/share/test1234",
    );
    expect(metadata.openGraph).toMatchObject({
      title: "Repodoc — Owner/Repo Health Report",
      url: "https://repodoc.dev/share/test1234",
      images: [
        {
          url: "https://repodoc.dev/opengraph-image",
          width: 1200,
          height: 630,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Repodoc — Owner/Repo Health Report",
      images: [{ url: "https://repodoc.dev/opengraph-image" }],
    });
  });

  it.each(["short", "too_long_share_id", "bad!char", "spaces  ", ""])(
    "rejects invalid metadata share IDs before querying: %j",
    async (shareId) => {
      await expect(
        generateMetadata({ params: Promise.resolve({ shareId }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("does not generate a report preview for a missing share", async () => {
    lookup.mockResolvedValue(null);
    await expect(
      generateMetadata({ params: Promise.resolve({ shareId: "missing1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("preserves database failures instead of fabricating report metadata", async () => {
    const failure = new Error("Database unavailable");
    lookup.mockRejectedValueOnce(failure);
    await expect(
      generateMetadata({ params: Promise.resolve({ shareId: "test1234" }) }),
    ).rejects.toBe(failure);
  });
});

describe("shareable report server route", () => {
  it("awaits route params and passes the saved report to the controller", async () => {
    lookup.mockResolvedValue(report);
    const page = await Page({
      params: Promise.resolve({ shareId: "test1234" }),
    });
    expect(lookup).toHaveBeenCalledWith("test1234");
    expect(page.props.initialReport).toEqual(report);
    expect(page.props.shareId).toBe("test1234");
  });

  it("calls notFound when report does not exist in database", async () => {
    lookup.mockResolvedValue(null);
    await expect(
      Page({ params: Promise.resolve({ shareId: "missing1" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(lookup).toHaveBeenCalledWith("missing1");
  });

  it.each(["short", "too_long_share_id", "bad!char", "spaces  ", ""])(
    "rejects invalid share ID before querying: %j",
    async (shareId) => {
      await expect(
        Page({ params: Promise.resolve({ shareId }) }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("propagates database failures to the route error boundary", async () => {
    const failure = new Error("Database unavailable");
    lookup.mockRejectedValueOnce(failure);
    let caught: unknown;
    try {
      await Page({ params: Promise.resolve({ shareId: "test1234" }) });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
  });

  it("offers retry in error boundary and recovery in not-found", () => {
    const retry = vi.fn();
    const { unmount } = render(<ShareError retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try loading again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain(
      "The shared report could not be retrieved",
    );
    unmount();
    render(<ShareNotFound />);
    expect(
      screen.getByRole("heading", { name: "Report not found" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "Audit a repository" })
        .getAttribute("href"),
    ).toBe("/#hero");
  });
});
