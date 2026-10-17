import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useSession } from "next-auth/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth-provider";
import { AuthGate } from "../auth-gate";
import { session } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();

function Status() {
  const { data, status } = useSession();
  return (
    <p>
      {status}
      {data ? `: ${data.user.username}` : ""}
    </p>
  );
}

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => Response.json(session));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("public session provider", () => {
  it("shares public session state across consumers after loading", async () => {
    render(
      <AuthProvider>
        <Status />
        <AuthGate>
          <button>Protected</button>
        </AuthGate>
      </AuthProvider>,
    );
    expect(screen.getByText("loading")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(await screen.findByText("authenticated: octocat")).toBeDefined();
    expect(screen.getByRole("button")).toBeDefined();
    expect(fetchMock).toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.every(([url]) =>
        String(url).includes("/api/auth/session"),
      ),
    ).toBe(true);
  });

  it("revalidates on focus and hides protected content after expiry", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(
      <AuthProvider>
        <Status />
        <AuthGate>
          <button>Protected</button>
        </AuthGate>
      </AuthProvider>,
    );
    await screen.findByText("authenticated: octocat");
    fetchMock.mockImplementation(async () => Response.json(null));
    fireEvent(document, new Event("visibilitychange"));
    expect(await screen.findByText("unauthenticated")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("updates an anonymous tab after another tab signs in", async () => {
    fetchMock.mockImplementation(async () => Response.json(null));
    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );
    await screen.findByText("unauthenticated");
    const otherTab = new BroadcastChannel("next-auth");
    try {
      fetchMock.mockImplementation(async () => Response.json(session));
      await act(async () => {
        otherTab.postMessage({ event: "session", data: { trigger: "signin" } });
      });
      await waitFor(() =>
        expect(screen.getByText("authenticated: octocat")).toBeDefined(),
      );
    } finally {
      otherTab.close();
    }
  });

  it.each(["configuration", "network"])(
    "keeps public content available on %s failure",
    async (failure) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      fetchMock.mockImplementation(async () => {
        if (failure === "network") throw new TypeError("Network unavailable");
        return Response.json(
          { error: "Authentication is not configured." },
          { status: 500 },
        );
      });
      render(
        <AuthProvider>
          <p>Public audit</p>
          <Status />
          <AuthGate>
            <button>Protected</button>
          </AuthGate>
        </AuthProvider>,
      );
      expect(screen.getByText("Public audit")).toBeDefined();
      await screen.findByText("unauthenticated");
      expect(screen.queryByRole("button")).toBeNull();
    },
  );
});
