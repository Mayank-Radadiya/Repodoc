import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { HeroPromptCard } from "@/components/landing/sections/hero/hero-prompt-card";
import { ScoringEngine } from "@/lib/scoring/engine";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("landing audit integration", () => {
  it("starts empty, validates the input, submits a real audit, and navigates to its report", async () => {
    const report = {
      ...ScoringEngine.run({
        owner: "facebook",
        repo: "react",
        paths: new Set(),
      }),
      shareId: "test1234",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(report));
    vi.stubGlobal("fetch", fetchMock);
    render(<HeroPromptCard />);
    const input = screen.getByRole<HTMLInputElement>("textbox", {
      name: "GitHub repository",
    });
    expect(input.value).toBe("");
    expect(input.id).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Audit repository" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "facebook/react" }));
    expect(input.value).toBe("facebook/react");
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.submit(input.closest("form")!);
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/report/facebook/react"),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("API ready")).toBeNull();
    expect(screen.queryByRole("button", { name: "Atomic PR" })).toBeNull();
  });

  it("shows malformed successful responses as errors without navigation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(Response.json(null)),
    );
    render(<HeroPromptCard />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "GitHub repository" }),
      { target: { value: "facebook/react" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Audit repository" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "invalid report",
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
