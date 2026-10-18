import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { cn } from "@/lib/utils";

describe("smoke test", () => {
  it("verifies test suite is functional", () => {
    expect(true).toBe(true);
  });

  it("verifies path alias resolution works", () => {
    expect(cn("font-bold", "text-center")).toBe("font-bold text-center");
  });

  it("verifies react testing library works", () => {
    render(React.createElement("div", { "data-testid": "smoke-element" }, "Repodoc"));
    expect(screen.getByTestId("smoke-element").textContent).toBe("Repodoc");
  });
});
