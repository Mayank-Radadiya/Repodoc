import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TreeTraversalVisual } from "../tree-traversal-visual";
import { RubricAuditVisual } from "../rubric-audit-visual";
import { AtomicPrVisual } from "../atomic-pr-visual";
import { BadgePreview } from "../../hero-observatory/badge-preview";

vi.mock("motion/react", () => ({ useReducedMotion: () => true, motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> } }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it.each([
  [TreeTraversalVisual, "Re-simulate Ingestion"],
  [RubricAuditVisual, "Re-evaluate Rubric"],
  [AtomicPrVisual, "Simulate 1-Click PR"],
] as const)("clears simulation timers when its panel is removed: %s", (Component, label) => {
  vi.useFakeTimers();
  const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
  const { unmount } = render(<Component />);
  fireEvent.click(screen.getByRole("button", { name: label }));
  unmount();
  expect(clearTimeoutSpy).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("shows a clipboard failure instead of reporting success", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
    writeText: vi.fn().mockRejectedValue(new Error("Denied")),
  } });
  render(<BadgePreview fixed={false} score={80} badgeColor="green" />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy Markdown" })); });
  expect(screen.getByRole("alert").textContent).toContain("Could not copy");
  expect(screen.queryByText("Copied snippet")).toBeNull();
});
