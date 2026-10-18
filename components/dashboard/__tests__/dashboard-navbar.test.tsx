import {
  cleanup,
  fireEvent,
  render as renderWithContext,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardNavbar } from "../dashboard-navbar";
import {
  renderSignedOut as render,
  TestAuthSession,
} from "@/components/auth/__tests__/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

afterEach(() => cleanup());

describe("DashboardNavbar", () => {
  it("renders brand, static dashboard breadcrumb badge (not a link), and excludes observatory", () => {
    render(<DashboardNavbar />);

    const brand = screen.getByRole("link", { name: /repodoc home/i });
    expect(brand.getAttribute("href")).toBe("/");

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();

    expect(screen.queryByText(/observatory/i)).toBeNull();
  });

  it("renders custom section badge when passed as prop", () => {
    render(<DashboardNavbar section="Reports" />);
    expect(screen.getByText("Reports")).toBeDefined();
  });

  it("renders command trigger with keyboard badge and opens audit dialog on click", async () => {
    render(<DashboardNavbar />);

    const commandTrigger = screen.getByRole("button", {
      name: /audit a github repository/i,
    });
    expect(commandTrigger).toBeDefined();
    expect(screen.getByText("⌘K")).toBeDefined();

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(commandTrigger);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: /audit a github repository/i,
      }),
    ).toBeDefined();
  });

  it("opens audit dialog on Meta+K and Ctrl+K keyboard shortcut", async () => {
    render(<DashboardNavbar />);

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeDefined();
  });

  it("does not render extra action buttons beside the command bar", () => {
    render(<DashboardNavbar />);

    expect(
      screen.queryByRole("button", { name: /^\+ audit|audit repository$/i }),
    ).toBeNull();
  });

  it("renders account controls with authenticated session", () => {
    renderWithContext(
      <TestAuthSession status="authenticated">
        <DashboardNavbar />
      </TestAuthSession>,
    );

    expect(
      screen.getByRole("button", { name: /account menu for octocat/i }),
    ).toBeDefined();
  });
});
