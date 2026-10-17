import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "next-auth/react";
import { AuthControls } from "../auth-controls";
import { session, TestAuthSession } from "./fixtures";

vi.mock("next-auth/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-auth/react")>()),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(signIn).mockReset().mockResolvedValue({
    error: undefined,
    code: undefined,
    status: 200,
    ok: true,
    url: "https://github.com/login/oauth/authorize",
  });
  vi.mocked(signOut)
    .mockReset()
    .mockResolvedValue({ url: "http://localhost:3000" });
  window.history.replaceState({}, "", "/");
});
afterEach(() => cleanup());

function show(
  status: "loading" | "unauthenticated" | "authenticated" = "authenticated",
) {
  return render(
    <TestAuthSession status={status}>
      <AuthControls />
    </TestAuthSession>,
  );
}

async function openMenu() {
  fireEvent.click(
    screen.getByRole("button", { name: "Account menu for octocat" }),
  );
  return screen.findByRole("menuitem", { name: "Sign out" });
}

describe("authentication controls", () => {
  it("reserves space while loading and reacts to login and logout", () => {
    const { rerender } = show("loading");
    expect(screen.getByRole("status").textContent).toContain(
      "Checking sign-in status",
    );
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <TestAuthSession>
        <AuthControls />
      </TestAuthSession>,
    );
    expect(
      screen.getByRole("button", { name: "Sign in with GitHub" }),
    ).toBeDefined();
    rerender(
      <TestAuthSession status="authenticated">
        <AuthControls />
      </TestAuthSession>,
    );
    expect(
      screen.getByRole("button", { name: "Account menu for octocat" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Sign in with GitHub" }),
    ).toBeNull();
    rerender(
      <TestAuthSession>
        <AuthControls />
      </TestAuthSession>,
    );
    expect(
      screen.queryByRole("button", { name: "Account menu for octocat" }),
    ).toBeNull();
  });

  it.each([
    "/",
    "/report/Owner/Repo?view=all#category-hygiene",
    "/share/abcd1234",
  ])(
    "starts GitHub OAuth with the current same-origin destination %s",
    async (path) => {
      window.history.replaceState({}, "", path);
      show("unauthenticated");
      const button = screen.getByRole("button", {
        name: "Sign in with GitHub",
      });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(signIn).toHaveBeenCalledExactlyOnceWith("github", {
        redirectTo: window.location.href,
      });
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(screen.getByText("Signing in…")).toBeDefined();
    },
  );

  it("ignores externally supplied callback query parameters", () => {
    window.history.replaceState(
      {},
      "",
      "/report/a/b?callbackUrl=https://untrusted.example",
    );
    show("unauthenticated");
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in with GitHub" }),
    );
    expect(signIn).toHaveBeenCalledWith("github", {
      redirectTo: window.location.href,
    });
  });

  it("shows safe sign-in errors and allows retry", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(
      new Error("private provider payload"),
    );
    show("unauthenticated");
    const button = screen.getByRole("button", { name: "Sign in with GitHub" });
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unable to sign in. Please try again.",
    );
    expect(screen.queryByText(/private provider/)).toBeNull();
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
    fireEvent.click(button);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses initials when an avatar is missing or fails to load", async () => {
    const { container, rerender } = render(
      <TestAuthSession
        status="authenticated"
        userSession={{ ...session, user: { ...session.user, image: null } }}
      >
        <AuthControls />
      </TestAuthSession>,
    );
    expect(await screen.findByText("OC")).toBeDefined();
    rerender(
      <TestAuthSession status="authenticated">
        <AuthControls />
      </TestAuthSession>,
    );
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe(session.user.image);
    fireEvent.load(image);
    await waitFor(() =>
      expect(
        container.querySelector('[data-slot="avatar-fallback"]'),
      ).toBeNull(),
    );
    fireEvent.error(image);
    expect(await screen.findByText("OC")).toBeDefined();
  });

  it("shows identity and signs out once, returning to the current report", async () => {
    window.history.replaceState({}, "", "/report/Owner/Repo");
    show();
    const item = await openMenu();
    expect(screen.getByText("Signed in as @octocat")).toBeDefined();
    fireEvent.click(item);
    fireEvent.click(item);
    expect(signOut).toHaveBeenCalledExactlyOnceWith({
      redirectTo: window.location.href,
    });
    expect(screen.getByRole("status").textContent).toBe("Signing out…");
    expect(
      screen
        .getByRole("button", { name: "Account menu for octocat" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows safe sign-out errors and lets the user retry", async () => {
    vi.mocked(signOut).mockRejectedValueOnce(new Error("private token"));
    show();
    fireEvent.click(await openMenu());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unable to sign out. Please try again.",
    );
    expect(screen.queryByText(/private token/)).toBeNull();
    fireEvent.click(await openMenu());
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it("opens with the keyboard, focuses Sign out, and restores focus on Escape", async () => {
    show();
    const trigger = screen.getByRole("button", {
      name: "Account menu for octocat",
    });
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const item = await screen.findByRole("menuitem", { name: "Sign out" });
    await waitFor(() => expect(document.activeElement).toBe(item));
    fireEvent.keyDown(item, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
