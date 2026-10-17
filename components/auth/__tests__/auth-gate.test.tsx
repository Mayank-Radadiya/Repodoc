import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthGate } from "../auth-gate";
import { TestAuthSession } from "./fixtures";

afterEach(() => cleanup());

describe("authentication gate", () => {
  it.each(["loading", "unauthenticated", "authenticated"] as const)(
    "gates children for %s",
    (status) => {
      render(
        <TestAuthSession status={status}>
          <AuthGate>
            <button>Protected action</button>
          </AuthGate>
        </TestAuthSession>,
      );
      expect(Boolean(screen.queryByRole("button"))).toBe(
        status === "authenticated",
      );
    },
  );

  it("renders an optional fallback and removes protected content on logout", () => {
    const content = (
      <AuthGate fallback={<p>Sign in first</p>}>
        <button>Protected action</button>
      </AuthGate>
    );
    const { rerender } = render(
      <TestAuthSession status="authenticated">{content}</TestAuthSession>,
    );
    expect(screen.getByRole("button")).toBeDefined();
    rerender(<TestAuthSession>{content}</TestAuthSession>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Sign in first")).toBeDefined();
  });
});
