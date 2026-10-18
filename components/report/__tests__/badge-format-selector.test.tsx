import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { BadgeCopyButton } from "../badge-copy-button";
import { BadgeFormatSelector, FORMATS } from "../badge-format-selector";
import { Tabs } from "@/components/ui/tabs";

describe("BadgeCopyButton component", () => {
  it("renders idle copy state with correct label", () => {
    const onCopy = vi.fn();
    render(
      <BadgeCopyButton
        copied={false}
        copying={false}
        copyError={false}
        copyLabel="Markdown"
        activeFormat="markdown"
        onCopy={onCopy}
      />,
    );

    const button = screen.getByRole("button", { name: "Copy markdown snippet" });
    expect(button).toBeDefined();
    expect(button.textContent).toContain("Copy Markdown");

    fireEvent.click(button);
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("renders copied state correctly", () => {
    render(
      <BadgeCopyButton
        copied={true}
        copying={false}
        copyError={false}
        copyLabel="Markdown"
        activeFormat="markdown"
        onCopy={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Copied snippet to clipboard" });
    expect(button).toBeDefined();
    expect(button.textContent).toContain("Copied");
  });
});

describe("BadgeFormatSelector component", () => {
  it("renders all three format tabs", () => {
    render(
      <Tabs value="markdown">
        <BadgeFormatSelector />
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: "Markdown" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "HTML" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Image URL" })).toBeDefined();
  });
});
