import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn } from "next-auth/react";
import { TestAuthSession } from "@/components/auth/__tests__/fixtures";
import { FixButton, type FixButtonProps } from "../fix-button";
import { ReportController } from "../report-controller";
import { ShareController } from "../share-controller";
import { ReportThemeScope } from "../theme-scope";
import { makeCheck, makeFixtureReport } from "./report-fixtures";

vi.mock("next-auth/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("next-auth/react")>(),
  signIn: vi.fn(),
}));

function finding(id: string, name = id, path = id) {
  return makeCheck(id, name, "hygiene", 0, 5, false, {
    remediation: {
      canAutomate: true,
      targetPath: path,
      description: `Add ${name}`,
    },
  });
}
const failed = finding("gitignore", ".gitignore", ".gitignore");
const license = finding("license", "License", "LICENSE");
const conduct = finding(
  "code-of-conduct",
  "Code of conduct",
  "CODE_OF_CONDUCT.md",
);
const result = {
  prUrl: "https://github.com/example/repository/pull/42",
  filesCreated: [".gitignore"],
};
const fetchMock = vi.fn<typeof fetch>();
const coordinates = { owner: "example", repo: "repository" };
function Wrapper({
  children,
  status = "authenticated",
}: {
  children: React.ReactNode;
  status?: "authenticated" | "unauthenticated" | "loading";
}) {
  return (
    <TestAuthSession status={status}>
      <ReportThemeScope>{children}</ReportThemeScope>
    </TestAuthSession>
  );
}
function show(props: Partial<FixButtonProps> = {}) {
  return render(
    <Wrapper>
      <FixButton {...coordinates} checks={[failed]} {...props} />
    </Wrapper>,
  );
}
async function open() {
  fireEvent.click(screen.getByRole("button", { name: "Fix All" }));
  return screen.findByRole("dialog", { name: "Fix repository findings" });
}
function body() {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}
function fill(name: string, value: string) {
  fireEvent.change(screen.getByRole("textbox", { name }), {
    target: { value },
  });
}

beforeEach(() => {
  vi.mocked(signIn).mockReset().mockResolvedValue({ error: undefined, code: undefined, status: 200, ok: true, url: "https://github.com/login/oauth/authorize" });
  fetchMock.mockReset().mockResolvedValue(Response.json(result));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Fix All flow", () => {
  it("offers authorization recovery and prevents duplicate reconnect requests", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: "workflow_scope_required" }, { status: 403 }));
    show();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Create pull request" }));
    expect((await screen.findByRole("alert")).textContent).toContain("deselect Automated CI workflow");
    const reconnect = screen.getByRole("button", { name: "Reconnect GitHub" });
    fireEvent.click(reconnect);
    fireEvent.click(reconnect);
    await waitFor(() => expect(signIn).toHaveBeenCalledExactlyOnceWith("github", { redirectTo: window.location.href }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows retrying a failed authorization redirect", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("private"));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    show();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Create pull request" }));
    const reconnect = await screen.findByRole("button", { name: "Reconnect GitHub" });
    fireEvent.click(reconnect);
    await screen.findByText("Unable to reconnect GitHub. Please try again.");
    fireEvent.click(reconnect);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
  });

  it("lets the user exclude CI and create a PR for the remaining fixes", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ code: "workflow_scope_required" }, { status: 403 }));
    show({ checks: [failed, finding("ci-workflow", "Automated CI workflow")] });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Create pull request" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue without CI workflow" }));
    expect(screen.getByRole("checkbox", { name: "Automated CI workflow" }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Create pull request" }));
    await screen.findByRole("link", { name: /View pull request/ });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).fixes).toEqual(["gitignore"]);
  });

  it.each(["loading", "unauthenticated", "authenticated"] as const)(
    "gates for %s",
    (status) => {
      render(
        <Wrapper status={status}>
          <FixButton {...coordinates} checks={[failed]} />
        </Wrapper>,
      );
      expect(Boolean(screen.queryByRole("button", { name: "Fix All" }))).toBe(
        status === "authenticated",
      );
    },
  );
  it.each(
    [
      [],
      [{ ...failed, passed: true }],
      [{ ...failed, remediation: undefined }],
      [
        {
          ...failed,
          remediation: { ...failed.remediation!, canAutomate: false },
        },
      ],
      [finding("unsupported")],
    ].map((checks) => ({ checks })),
  )("hides without supported failures: %j", ({ checks }) => {
    show({ checks });
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("preselects supported fixes once and excludes manual and passed checks", async () => {
    show({
      checks: [
        failed,
        failed,
        license,
        conduct,
        finding("ci-workflow"),
        finding("security-policy"),
        finding("unknown"),
        { ...failed, id: "passed", passed: true },
      ],
    });
    await open();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(5);
    expect(screen.getByText("Add .gitignore")).toBeDefined();
    expect(screen.getByText("CODE_OF_CONDUCT.md")).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("disables empty selections and sends just the selected fixes", async () => {
    show({ checks: [failed, finding("security-policy", "Security")] });
    await open();
    fireEvent.click(screen.getByRole("checkbox", { name: ".gitignore" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Security" }));
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Create pull request",
      }).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Security" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create pull request" }),
    );
    await screen.findByRole("link", { name: /View pull request/ });
    expect(body()).toEqual({ ...coordinates, fixes: ["security-policy"] });
  });
  it("requires explicit conditional inputs, never prefilling from the account", async () => {
    show({ checks: [license, conduct] });
    await open();
    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Copyright holder",
      }).value,
    ).toBe("");
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continue to license",
      }).disabled,
    ).toBe(true);
    fill("Copyright holder", " ");
    fill("Code of conduct reporting contact", "contact@example.test");
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continue to license",
      }).disabled,
    ).toBe(true);
    fill("Copyright holder", "Holder\u2028Second line");
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continue to license",
      }).disabled,
    ).toBe(true);
    fill("Copyright holder", "Holder");
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Continue to license",
      }).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "License" }));
    expect(
      screen.queryByRole("textbox", { name: "Copyright holder" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Create pull request" }),
    );
    await screen.findByRole("link", { name: /View pull request/ });
    expect(body()).toEqual({
      ...coordinates,
      fixes: ["code-of-conduct"],
      codeOfConductContact: "contact@example.test",
    });
  });
  it.each([
    ["MIT", "MIT"],
    ["Apache-2.0", "Apache-2.0"],
    ["BSD-3-Clause", "BSD-3-Clause"],
    ["GPL-3.0 (version 3 only)", "GPL-3.0-only"],
    ["MPL-2.0", "MPL-2.0"],
  ])(
    "requires confirmation and forwards %s unchanged",
    async (label, choice) => {
      show({ checks: [license, failed, conduct] });
      await open();
      fill("Copyright holder", "  Holder  ");
      fill("Code of conduct reporting contact", "  contact@example.test  ");
      fireEvent.click(
        screen.getByRole("button", { name: "Continue to license" }),
      );
      await screen.findByRole("dialog", { name: "Choose a license" });
      const confirm = screen.getByRole<HTMLButtonElement>("button", {
        name: "Use selected license",
      });
      expect(confirm.disabled).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("radio", { name: label }));
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.click(confirm);
      const link = await screen.findByRole("link", {
        name: /View pull request/,
      });
      expect(body()).toEqual({
        ...coordinates,
        fixes: ["license", "gitignore", "code-of-conduct"],
        licenseChoice: choice,
        licenseFullName: "Holder",
        codeOfConductContact: "contact@example.test",
      });
      expect(link.getAttribute("href")).toBe(result.prUrl);
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(
        screen.getByRole("link", { name: /View pull request/ }),
      ).toBeDefined();
    },
  );
  it("returns from license cancellation with inputs preserved and clears the next choice", async () => {
    show({ checks: [license, failed] });
    await open();
    fill("Copyright holder", "Holder");
    fireEvent.click(screen.getByRole("checkbox", { name: ".gitignore" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to license" }),
    );
    fireEvent.click(await screen.findByRole("radio", { name: "MIT" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await screen.findByRole("dialog", { name: "Fix repository findings" });
    expect(
      screen.getByRole<HTMLInputElement>("textbox", {
        name: "Copyright holder",
      }).value,
    ).toBe("Holder");
    expect(
      screen
        .getByRole("checkbox", { name: ".gitignore" })
        .getAttribute("aria-checked"),
    ).toBe("false");
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to license" }),
    );
    await screen.findByRole("dialog", { name: "Choose a license" });
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("prevents duplicate submits and continues when dismissed", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = vi.fn();
    show({ onPendingChange: pending });
    const dialog = await open();
    const button = screen.getByRole("button", { name: "Create pull request" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.submit(dialog.querySelector("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pending).toHaveBeenLastCalledWith(true);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole("status", { name: "Remediation progress" }).textContent,
    ).toMatch(/Creating remediation/);
    await act(async () => resolve(Response.json(result)));
    expect(
      screen.getByRole("link", { name: /View pull request/ }),
    ).toBeDefined();
    expect(pending).toHaveBeenLastCalledWith(false);
  });
  it.each([400, 401, 403, 404, 409, 500, 502])(
    "shows guidance and preserves input after HTTP %s",
    async (status) => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: "private" }, { status }),
      );
      show({ checks: [conduct] });
      await open();
      fill("Code of conduct reporting contact", "team@example.test");
      fireEvent.click(
        screen.getByRole("button", { name: "Create pull request" }),
      );
      expect((await screen.findByRole("alert")).textContent).not.toContain(
        "private",
      );
      expect(
        screen.getByRole<HTMLInputElement>("textbox", {
          name: "Code of conduct reporting contact",
        }).value,
      ).toBe("team@example.test");
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await screen.findByRole("link", { name: /View pull request/ });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );
  it("honors retry timing without an automatic retry", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 429, headers: { "Retry-After": "2" } }),
    );
    show();
    await open();
    vi.useFakeTimers();
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Create pull request" }),
      ),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Try again in 2 seconds",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Try again" })
        .disabled,
    ).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Try again" })
        .disabled,
    ).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["network", "malformed"])(
    "shows recoverable %s errors",
    async (failure) => {
      if (failure === "network")
        fetchMock.mockRejectedValueOnce(new Error("private"));
      else
        fetchMock.mockResolvedValueOnce(
          Response.json({ ...result, prUrl: "javascript:alert(1)" }),
        );
      show();
      await open();
      fireEvent.click(
        screen.getByRole("button", { name: "Create pull request" }),
      );
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /open pull requests/,
      );
      expect(
        screen.queryByRole("link", { name: /View pull request/ }),
      ).toBeNull();
    },
  );
  it("disables the entry point during re-auditing", () => {
    show({ disabled: true });
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Fix All" })
        .disabled,
    ).toBe(true);
  });
  it.each(["unmount", "session", "navigation", "report"])(
    "aborts pending requests on %s and ignores late results",
    async (change) => {
      let resolve!: (response: Response) => void;
      fetchMock.mockImplementation(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      const pending = vi.fn();
      const { rerender, unmount } = show({ onPendingChange: pending });
      await open();
      fireEvent.click(
        screen.getByRole("button", { name: "Create pull request" }),
      );
      const signal = fetchMock.mock.calls[0][1]?.signal;
      if (change === "unmount") unmount();
      else
        rerender(
          <Wrapper
            status={change === "session" ? "unauthenticated" : "authenticated"}
          >
            <FixButton
              {...coordinates}
              repo={change === "navigation" ? "other" : coordinates.repo}
              checks={change === "report" ? [failed, conduct] : [failed]}
              onPendingChange={pending}
            />
          </Wrapper>,
        );
      expect(signal?.aborted).toBe(true);
      expect(pending).toHaveBeenLastCalledWith(false);
      await act(async () => resolve(Response.json(result)));
      expect(
        screen.queryByRole("link", { name: /View pull request/ }),
      ).toBeNull();
    },
  );
  it("keeps previews separate, coordinates audit locks, and leaves shared snapshots read-only", async () => {
    const report = {
      ...makeFixtureReport(),
      checks: [failed],
      shareId: "abcd1234",
    };
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { rerender } = render(
      <Wrapper>
        <ReportController {...coordinates} initialReport={report} />
      </Wrapper>,
    );
    await act(async () => {});
    fireEvent.click(
      screen.getByRole("button", {
        name: /.gitignore \(Project Hygiene\): preview/i,
      }),
    );
    const score = screen.getByRole("meter").getAttribute("aria-valuenow");
    await open();
    fireEvent.click(
      screen.getByRole("button", { name: "Create pull request" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Re-audit" })
        .disabled,
    ).toBe(true);
    await act(async () => resolve(Response.json(result)));
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe(score);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Re-audit" })
        .disabled,
    ).toBe(false);
    rerender(
      <Wrapper>
        <ShareController shareId={report.shareId} initialReport={report} />
      </Wrapper>,
    );
    expect(screen.queryByRole("button", { name: "Fix All" })).toBeNull();
  });
});
