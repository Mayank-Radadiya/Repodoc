import { Activity } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TestAuthSession } from "@/components/auth/__tests__/fixtures";
import { ReportController } from "../report-controller";
import { FixButton } from "../fix-button";
import { ReportThemeScope } from "../theme-scope";
import { ScoringEngine } from "@/lib/scoring/engine";
import { UrlInput } from "../url-input";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { sampleDashboardData } from "@/components/dashboard/__tests__/fixtures";

const report = { ...ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set() }), shareId: "test1234" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("restores dashboard audit controls and ignores late results after navigation", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = (mode: "visible" | "hidden") => <Activity mode={mode}><DashboardView initialData={sampleDashboardData} fetcher={fetcher} /></Activity>;
  const { rerender } = render(view("visible"));
  fireEvent.click(screen.getByRole("button", { name: "Needs audit" }));
  fireEvent.click(screen.getByRole("button", { name: "Audit repository" }));
  rerender(view("hidden"));
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  rerender(view("visible"));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Audit interrupted"));
  await act(async () => { finish(Response.json(report)); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((screen.getByRole("button", { name: "Retry audit" }) as HTMLButtonElement).disabled).toBe(false);
});

it("restores a saved report after aborting a re-audit without an extra audit", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  const view = (mode: "visible" | "hidden") => <TestAuthSession><Activity mode={mode}>
    <ReportController owner="owner" repo="repo" initialReport={report} />
  </Activity></TestAuthSession>;
  const { rerender } = render(view("visible"));
  await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Re-audit" }));
  expect(fetcher).toHaveBeenCalledTimes(1);
  rerender(view("hidden"));
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  rerender(view("visible"));
  await waitFor(() => expect((screen.getByRole("button", { name: "Re-audit" }) as HTMLButtonElement).disabled).toBe(false));
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("does not navigate or invoke success after an audit composer is abandoned", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const push = vi.fn();
  const success = vi.fn();
  const { unmount } = render(<UrlInput initialValue="owner/repo" router={{ push }} fetcher={fetcher} onAuditSuccess={success} />);
  fireEvent.submit(screen.getByRole("search"));
  unmount();
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await act(async () => { finish(Response.json(report)); });
  expect(push).not.toHaveBeenCalled();
  expect(success).not.toHaveBeenCalled();
});

it("restores interrupted remediation with uncertainty guidance and no automatic retry", async () => {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  const checks = report.checks.filter((check) => check.id === "gitignore");
  const view = (mode: "visible" | "hidden") => <TestAuthSession status="authenticated"><ReportThemeScope>
    <Activity mode={mode}><FixButton owner="owner" repo="repo" checks={checks} /></Activity>
  </ReportThemeScope></TestAuthSession>;
  const { rerender } = render(view("visible"));
  fireEvent.click(screen.getByRole("button", { name: "Fix All" }));
  fireEvent.click(await screen.findByRole("button", { name: "Create pull request" }));
  rerender(view("hidden"));
  expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  rerender(view("visible"));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("outcome is uncertain"));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect((screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement).disabled).toBe(false);
});
