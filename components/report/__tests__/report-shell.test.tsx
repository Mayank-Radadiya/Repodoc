import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportThemeScope } from "@/components/report/theme-scope";
import { ReportShell } from "@/components/report/report-shell";

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

describe("ReportShell", () => {
  it("renders navigation, skip link and report content", () => {
    render(
      <ReportThemeScope>
        <ReportShell>
          <p>report body</p>
        </ReportShell>
      </ReportThemeScope>,
    );

    expect(
      screen.getByRole("navigation", { name: /report navigation/i }),
    ).toBeDefined();
    const brand = screen.getByRole("link", { name: /repodoc home/i });
    expect(brand.getAttribute("href")).toBe("/");
    const skip = screen.getByRole("link", { name: /skip to report/i });
    expect(skip.getAttribute("href")).toBe("#report-content");
    const main = screen.getByRole("main");
    expect(main.getAttribute("id")).toBe("report-content");
    expect(screen.getByText("report body")).toBeDefined();
  });

  it("opens the audit dialog from the header button inside the theme scope", async () => {
    render(
      <ReportThemeScope initialTheme="dark">
        <ReportShell>content</ReportShell>
      </ReportThemeScope>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: /audit another repository/i }),
    );
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("heading", {
        name: /audit a github repository/i,
      }),
    ).toBeDefined();
    expect(
      within(dialog).getByLabelText(/github repository/i),
    ).toBeDefined();

    const scope = screen.getByTestId("report-theme-scope");
    expect(scope.contains(dialog)).toBe(true);
  });

  it("closes the audit dialog when Escape is pressed", async () => {
    render(
      <ReportThemeScope>
        <ReportShell>content</ReportShell>
      </ReportThemeScope>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /audit another repository/i }),
    );
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("toggles the audit dialog with the keyboard shortcut", async () => {
    render(
      <ReportThemeScope>
        <ReportShell>content</ReportShell>
      </ReportThemeScope>,
    );

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("exposes the theme toggle in the header", () => {
    render(
      <ReportThemeScope initialTheme="dark">
        <ReportShell>content</ReportShell>
      </ReportThemeScope>,
    );

    expect(
      screen.getByRole("button", { name: /switch to light theme/i }),
    ).toBeDefined();
  });
});
