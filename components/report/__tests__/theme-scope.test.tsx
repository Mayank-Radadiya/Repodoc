import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  REPORT_THEME_COOKIE,
  ReportThemeScope,
  parseReportTheme,
  useReportTheme,
} from "@/components/report/theme-scope";
import { ThemeToggle } from "@/components/report/theme-toggle";

afterEach(() => {
  cleanup();
  document.cookie = "repodoc-theme=; max-age=0; path=/";
});

function ThemeReadout() {
  const { theme } = useReportTheme();
  return <span data-testid="theme-readout">{theme}</span>;
}

describe("parseReportTheme", () => {
  it("accepts the dark value", () => {
    expect(parseReportTheme("dark")).toBe("dark");
  });

  it("accepts the light value", () => {
    expect(parseReportTheme("light")).toBe("light");
  });

  it("defaults to light for missing or unknown values", () => {
    expect(parseReportTheme(undefined)).toBe("light");
    expect(parseReportTheme(null)).toBe("light");
    expect(parseReportTheme("sepia")).toBe("light");
  });

  it("exposes the persistence cookie name", () => {
    expect(REPORT_THEME_COOKIE).toBe("repodoc-theme");
  });
});

describe("ReportThemeScope", () => {
  it("renders children inside a light scope by default", () => {
    render(
      <ReportThemeScope>
        <button type="button">inside</button>
      </ReportThemeScope>,
    );

    const scope = screen.getByTestId("report-theme-scope");
    expect(scope.getAttribute("data-theme")).toBe("light");
    expect(scope.classList.contains("dark")).toBe(false);
    expect(screen.getByRole("button", { name: "inside" })).toBeDefined();
  });

  it("applies the dark class and color scheme for a dark initial theme", () => {
    render(
      <ReportThemeScope initialTheme="dark">
        <span>content</span>
      </ReportThemeScope>,
    );

    const scope = screen.getByTestId("report-theme-scope") as HTMLElement;
    expect(scope.getAttribute("data-theme")).toBe("dark");
    expect(scope.classList.contains("dark")).toBe(true);
    expect(scope.style.colorScheme).toBe("dark");
  });

  it("toggles theme, class and cookie through the theme toggle", () => {
    render(
      <ReportThemeScope initialTheme="dark">
        <ThemeToggle />
        <ThemeReadout />
      </ReportThemeScope>,
    );

    const scope = screen.getByTestId("report-theme-scope");

    fireEvent.click(
      screen.getByRole("button", { name: /switch to light theme/i }),
    );
    expect(screen.getByTestId("theme-readout").textContent).toBe("light");
    expect(scope.classList.contains("dark")).toBe(false);
    expect(document.cookie).toContain(`${REPORT_THEME_COOKIE}=light`);

    fireEvent.click(
      screen.getByRole("button", { name: /switch to dark theme/i }),
    );
    expect(screen.getByTestId("theme-readout").textContent).toBe("dark");
    expect(scope.classList.contains("dark")).toBe(true);
    expect(document.cookie).toContain(`${REPORT_THEME_COOKIE}=dark`);
  });

  it("labels the toggle with the theme it switches to", () => {
    render(
      <ReportThemeScope initialTheme="light">
        <ThemeToggle />
      </ReportThemeScope>,
    );

    expect(
      screen.getByRole("button", { name: /switch to dark theme/i }),
    ).toBeDefined();
  });

  it("throws when the theme context is missing", () => {
    expect(() => render(<ThemeReadout />)).toThrow(/ReportThemeScope/);
  });
});
