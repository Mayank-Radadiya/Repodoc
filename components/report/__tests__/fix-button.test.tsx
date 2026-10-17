import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TestAuthSession } from "@/components/auth/__tests__/fixtures";
import { FixButton } from "../fix-button";
import { ReportController } from "../report-controller";
import { ShareController } from "../share-controller";
import { makeCheck, makeFixtureReport } from "./report-fixtures";

const failed = makeCheck("gitignore", ".gitignore", "hygiene", 0, 5, false, {
  remediation: {
    canAutomate: true,
    targetPath: ".gitignore",
    description: "Add a gitignore",
  },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Fix All entry point", () => {
  it.each(["loading", "unauthenticated", "authenticated"] as const)(
    "gates the button for %s",
    (status) => {
      render(
        <TestAuthSession status={status}>
          <FixButton checks={[failed]} />
        </TestAuthSession>,
      );
      expect(Boolean(screen.queryByRole("button", { name: "Fix All" }))).toBe(
        status === "authenticated",
      );
    },
  );

  it.each([
    { checks: [] },
    { checks: [{ ...failed, passed: true }] },
    { checks: [{ ...failed, remediation: undefined }] },
    {
      checks: [
        {
          ...failed,
          remediation: { ...failed.remediation!, canAutomate: false },
        },
      ],
    },
  ])(
    "hides the entry point when no failing automatable findings exist (%j)",
    ({ checks }) => {
      render(
        <TestAuthSession status="authenticated">
          <FixButton checks={checks} />
        </TestAuthSession>,
      );
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByText(/not available yet/)).toBeNull();
    },
  );

  it("explains the disabled state, makes no requests, and disappears on session expiry", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(
      <TestAuthSession status="authenticated">
        <FixButton checks={[failed]} />
      </TestAuthSession>,
    );
    const button = screen.getByRole<HTMLButtonElement>("button", {
      name: "Fix All",
    });
    expect(button.disabled).toBe(true);
    expect(
      document.getElementById(button.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toBe("Pull request creation is not available yet.");
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(fetchMock).not.toHaveBeenCalled();
    rerender(
      <TestAuthSession>
        <FixButton checks={[failed]} />
      </TestAuthSession>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses original live findings even after preview and keeps shared snapshots read-only", async () => {
    const report = {
      ...makeFixtureReport(),
      checks: [failed],
      shareId: "abcd1234",
    };
    const { rerender } = render(
      <TestAuthSession status="authenticated">
        <ReportController
          owner={report.owner}
          repo={report.repo}
          initialReport={report}
        />
      </TestAuthSession>,
    );
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Fix All" })).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", {
        name: /.gitignore \(Project Hygiene\): preview/i,
      }),
    );
    expect(screen.getByRole("button", { name: "Fix All" })).toBeDefined();
    rerender(
      <TestAuthSession status="authenticated">
        <ShareController shareId={report.shareId} initialReport={report} />
      </TestAuthSession>,
    );
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Fix All" })).toBeNull();
    expect(screen.getByText("Shared snapshot (read-only)")).toBeDefined();
  });
});
