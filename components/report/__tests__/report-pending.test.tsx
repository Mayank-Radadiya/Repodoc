import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportPending } from "../report-pending";

describe("ReportPending loading skeleton", () => {
  it("renders with status role, aria-busy true, and the given message", () => {
    render(<ReportPending message="Auditing octocat/Hello-World…" />);

    const status = screen.getByRole("status");
    expect(status).toBeDefined();
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Auditing octocat/Hello-World…")).toBeDefined();
  });

  it("keeps visual skeletons hidden from assistive technology", () => {
    const { container } = render(<ReportPending />);

    // Screen reader accessible heading
    expect(
      screen.getByRole("heading", { name: "Repository health report" }),
    ).toBeDefined();

    // Skeletons use motion-safe pulse
    const pulseElements = container.querySelectorAll(
      ".motion-safe\\:animate-pulse",
    );
    expect(pulseElements.length).toBeGreaterThan(0);

    const skeletons = container.querySelector('[aria-hidden="true"]');
    expect(skeletons).not.toBeNull();
    expect(skeletons?.contains(pulseElements[0])).toBe(true);
  });
});
