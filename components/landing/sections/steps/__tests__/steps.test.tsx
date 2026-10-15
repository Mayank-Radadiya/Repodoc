import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Steps } from "../steps";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Redesigned Steps ('How It Works') component", () => {
  it("renders the section heading, eyebrow, and initial Step 01 workbench", () => {
    render(<Steps />);

    // Eyebrow and main heading
    expect(
      screen.getByText(/pipeline architecture \/\/ how it works/i),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /three surgical operations\. zero guesswork\./i,
      }),
    ).toBeDefined();

    // Tablist exists with 3 tabs
    const tablist = screen.getByRole("tablist", {
      name: /how repodoc works workflow steps/i,
    });
    expect(tablist).toBeDefined();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(3);

    // Initial active tab should be Step 01
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
    expect(tabs[2].getAttribute("aria-selected")).toBe("false");

    // Workbench for Step 1 (Git Tree API) is visible
    expect(screen.getByText(/repodoc git tree api:/i)).toBeDefined();
    expect(screen.getByText(/1,482 objects mapped/i)).toBeDefined();
  });

  it("switches to Step 02 (Rubric Evaluation) when Tab 2 is clicked", async () => {
    render(<Steps />);

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);

    // Tab 2 is now selected
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");

    // Rubric visuals appear
    await waitFor(() => {
      expect(screen.getByText(/deterministic health score:/i)).toBeDefined();
      expect(screen.getByText(/5 core scoring categories/i)).toBeDefined();
      expect(screen.getByText(/ast evidence token stream/i)).toBeDefined();
    });
  });

  it("switches to Step 03 (Atomic Remediate) when Tab 3 is clicked", async () => {
    render(<Steps />);

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[2]);

    // Tab 3 is selected
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");

    // Atomic PR pipeline appears
    await waitFor(() => {
      expect(screen.getByText(/atomic git data api:/i)).toBeDefined();
      expect(screen.getByText(/git data api dag assembly/i)).toBeDefined();
      expect(screen.getByText(/generated atomic commit diff/i)).toBeDefined();
    });
  });

  it("allows selecting steps by clicking the bottom detail cards", async () => {
    render(<Steps />);

    // Click card 2 ("Defensible Rubric Audit")
    const card2 = screen.getByRole("button", {
      name: /select step 2: defensible rubric audit/i,
    });
    fireEvent.click(card2);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");

    // Click card 3 ("1-Click Atomic PR")
    const card3 = screen.getByRole("button", {
      name: /select step 3: 1-click atomic pr/i,
    });
    fireEvent.click(card3);

    expect(tabs[2].getAttribute("aria-selected")).toBe("true");
  });

  it("toggles automated tour playback when clicking the tour button", () => {
    render(<Steps />);

    const tourBtn = screen.getByRole("button", {
      name: /start automated workflow tour/i,
    });
    expect(tourBtn).toBeDefined();

    fireEvent.click(tourBtn);

    // After click, it should indicate playing
    expect(screen.getByText(/tour playing/i)).toBeDefined();
  });

  it("allows keyboard navigation between tabs using Arrow keys", () => {
    render(<Steps />);

    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();

    // Press ArrowRight to move to step 2
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");

    // Press ArrowRight again to move to step 3
    fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
    expect(tabs[2].getAttribute("aria-selected")).toBe("true");

    // Press ArrowLeft to return to step 2
    fireEvent.keyDown(tabs[2], { key: "ArrowLeft" });
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
  });
});
