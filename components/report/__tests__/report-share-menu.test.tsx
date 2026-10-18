import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportShareMenu } from "../report-share-menu";
import { ReportThemeScope } from "../theme-scope";

afterEach(cleanup);

describe("ReportShareMenu", () => {
  it("keeps sharing actions inside the report theme and preserves the encoded link", async () => {
    const onCopy = vi.fn();
    render(
      <ReportThemeScope initialTheme="dark">
        <ReportShareMenu
          shareId="snapshot/id"
          canCopy
          copyStatus="idle"
          onCopy={onCopy}
        />
      </ReportThemeScope>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    const link = await screen.findByRole("menuitem", { name: "Share link" });
    expect(link.getAttribute("href")).toBe("/share/snapshot%2Fid");
    expect(link.closest('[data-theme="dark"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy report link" }));
    await waitFor(() => expect(onCopy).toHaveBeenCalledTimes(1));
  });

  it("disables copying before the deployment origin is ready", async () => {
    const onCopy = vi.fn();
    render(
      <ReportShareMenu canCopy={false} copyStatus="idle" onCopy={onCopy} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    const copy = await screen.findByRole("menuitem", {
      name: "Copy report link",
    });
    expect(copy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(copy);
    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "Share link" })).toBeNull();
  });

  it("restores keyboard focus to Share after Escape", async () => {
    render(<ReportShareMenu canCopy copyStatus="idle" onCopy={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Share" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
