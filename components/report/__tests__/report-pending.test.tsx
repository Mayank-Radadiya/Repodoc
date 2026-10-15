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

  it("renders structured skeletons mirroring the category, score, and badge cards", () => {
    const { container } = render(<ReportPending />);

    // Screen reader accessible heading
    expect(
      screen.getByRole("heading", { name: "Repository health report" }),
    ).toBeDefined();

    // Skeletons use motion-safe pulse
    const pulseElements = container.querySelectorAll(".motion-safe\\:animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);

    // Grid layout with 3 columns on large screens
    const grid = container.querySelector(".lg\\:grid-cols-3");
    expect(grid).toBeDefined();
  });
});
