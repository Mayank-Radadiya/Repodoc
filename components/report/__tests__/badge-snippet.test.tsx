import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BadgeSnippet,
  DEFAULT_BASE_URL,
  DEFAULT_BADGE_LABEL,
  buildBadgeEndpointUrl,
  buildShieldsUrl,
  buildReportUrl,
  buildShareUrl,
  buildMarkdownSnippet,
  buildHtmlSnippet,
  getSnippetForFormat,
  copyToClipboard,
  sanitizeBaseUrl,
  sanitizeRepoCoordinate,
} from "@/components/report/badge-snippet";
import { BadgeSnippet as SrcBadgeSnippet } from "@/src/components/report/badge-snippet";
import { BadgeSnippet as RootBarrelBadgeSnippet } from "@/components/report";
import { BadgeSnippet as SrcBarrelBadgeSnippet } from "@/src/components/report";
import { BADGE_COLOR_PALETTE } from "@/components/report/score-gauge";
import type { AuditReport } from "@/src/lib/types";

function createMockReport(overrides?: Partial<AuditReport>): AuditReport {
  return {
    owner: "vercel",
    repo: "next.js",
    defaultBranch: "canary",
    healthScore: 92,
    rubricVersion: "1.0.0",
    generatedAt: "2026-10-13T12:00:00.000Z",
    checks: [],
    ...overrides,
  };
}

describe("BadgeSnippet Component", () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = Object.getOwnPropertyDescriptor(
    document,
    "execCommand",
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalExecCommand) {
      Object.defineProperty(document, "execCommand", originalExecCommand);
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe("Re-export and Barrel Integrity", () => {
    it("exports identical component from @/src/components/report/badge-snippet", () => {
      expect(SrcBadgeSnippet).toBe(BadgeSnippet);
    });

    it("exports identical component from root barrel @/components/report", () => {
      expect(RootBarrelBadgeSnippet).toBe(BadgeSnippet);
    });

    it("exports identical component from src barrel @/src/components/report", () => {
      expect(SrcBarrelBadgeSnippet).toBe(BadgeSnippet);
    });
  });

  describe("Pure URL & Snippet Utility Functions", () => {
    it("exports default constants correctly", () => {
      expect(DEFAULT_BASE_URL).toBe("https://repodoc.dev");
      expect(DEFAULT_BADGE_LABEL).toBe("Repo Health");
    });

    it("sanitizeBaseUrl handles empty, whitespace, and trailing slashes", () => {
      expect(sanitizeBaseUrl()).toBe(DEFAULT_BASE_URL);
      expect(sanitizeBaseUrl("")).toBe(DEFAULT_BASE_URL);
      expect(sanitizeBaseUrl("   ")).toBe(DEFAULT_BASE_URL);
      expect(sanitizeBaseUrl("https://example.com/")).toBe(
        "https://example.com",
      );
      expect(sanitizeBaseUrl("https://example.com///")).toBe(
        "https://example.com",
      );
      expect(sanitizeBaseUrl("https://example.com")).toBe(
        "https://example.com",
      );
    });

    it("sanitizeRepoCoordinate trims whitespace and leading/trailing slashes", () => {
      expect(sanitizeRepoCoordinate("foo")).toBe("foo");
      expect(sanitizeRepoCoordinate("  foo  ")).toBe("foo");
      expect(sanitizeRepoCoordinate("/foo/")).toBe("foo");
      expect(sanitizeRepoCoordinate("", "fallback")).toBe("fallback");
      expect(sanitizeRepoCoordinate(undefined, "fallback")).toBe("fallback");
    });

    it("buildBadgeEndpointUrl constructs correct API URL", () => {
      const url = buildBadgeEndpointUrl({ owner: "facebook", repo: "react" });
      expect(url).toBe("https://repodoc.dev/api/badge/facebook/react");
    });

    it("buildShieldsUrl constructs correct unencoded and encoded shields URLs", () => {
      const unencoded = buildShieldsUrl({ owner: "facebook", repo: "react" });
      expect(unencoded).toBe(
        "https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/facebook/react",
      );

      const encoded = buildShieldsUrl({
        owner: "facebook",
        repo: "react",
        encodeEndpointUrl: true,
      });
      expect(encoded).toBe(
        "https://img.shields.io/endpoint?url=https%3A%2F%2Frepodoc.dev%2Fapi%2Fbadge%2Ffacebook%2Freact",
      );
    });

    it("buildReportUrl constructs correct report web URL", () => {
      const url = buildReportUrl({ owner: "facebook", repo: "react" });
      expect(url).toBe("https://repodoc.dev/report/facebook/react");
    });

    it("buildShareUrl constructs correct shareable report web URL", () => {
      const url = buildShareUrl({ shareId: "test1234" });
      expect(url).toBe("https://repodoc.dev/share/test1234");
      expect(
        buildShareUrl({ shareId: "test1234", baseUrl: "https://audit.repo" }),
      ).toBe("https://audit.repo/share/test1234");
    });

    it("buildMarkdownSnippet matches exact idea.md specification", () => {
      const snippet = buildMarkdownSnippet({ owner: "owner", repo: "repo" });
      expect(snippet).toBe(
        "[![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/owner/repo)](https://repodoc.dev/report/owner/repo)",
      );
    });

    it("buildHtmlSnippet generates valid HTML anchor with image tag", () => {
      const snippet = buildHtmlSnippet({ owner: "owner", repo: "repo" });
      expect(snippet).toBe(
        '<a href="https://repodoc.dev/report/owner/repo"><img src="https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/owner/repo" alt="Repo Health" /></a>',
      );
    });

    it("getSnippetForFormat returns appropriate snippet for all formats", () => {
      const opts = { owner: "octocat", repo: "hello-world" };
      expect(getSnippetForFormat("markdown", opts)).toBe(
        buildMarkdownSnippet(opts),
      );
      expect(getSnippetForFormat("html", opts)).toBe(buildHtmlSnippet(opts));
      expect(getSnippetForFormat("url", opts)).toBe(buildShieldsUrl(opts));
    });
  });

  describe("Acceptance Criteria: Markdown Snippet & Preview Rendering", () => {
    it("renders the markdown embed snippet by default with owner and repo props", () => {
      render(<BadgeSnippet owner="facebook" repo="react" />);

      const expectedSnippet =
        "[![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/facebook/react)](https://repodoc.dev/report/facebook/react)";

      expect(screen.getByText(expectedSnippet)).toBeDefined();
    });

    it("extracts owner, repo, and score from an AuditReport prop", () => {
      const report = createMockReport({
        owner: "tailwindlabs",
        repo: "tailwindcss",
        healthScore: 88,
      });

      render(<BadgeSnippet report={report} />);

      const expectedSnippet =
        "[![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/tailwindlabs/tailwindcss)](https://repodoc.dev/report/tailwindlabs/tailwindcss)";

      expect(screen.getByText(expectedSnippet)).toBeDefined();

      const previewLink = screen.getByTestId("badge-preview-link");
      expect(previewLink.getAttribute("href")).toBe(
        "https://repodoc.dev/report/tailwindlabs/tailwindcss",
      );

      const scoreElement = screen.getByTestId("badge-preview-score");
      expect(scoreElement.textContent).toBe("88/100");
      expect(scoreElement.getAttribute("data-badge-color")).toBe("green");
    });

    it("supports custom baseUrl prop", () => {
      render(
        <BadgeSnippet
          owner="my-org"
          repo="my-repo"
          baseUrl="https://staging.repodoc.dev/"
        />,
      );

      const expectedSnippet =
        "[![Repo Health](https://img.shields.io/endpoint?url=https://staging.repodoc.dev/api/badge/my-org/my-repo)](https://staging.repodoc.dev/report/my-org/my-repo)";

      expect(screen.getByText(expectedSnippet)).toBeDefined();

      const previewLink = screen.getByTestId("badge-preview-link");
      expect(previewLink.getAttribute("href")).toBe(
        "https://staging.repodoc.dev/report/my-org/my-repo",
      );
    });

    it("supports custom label prop", () => {
      render(
        <BadgeSnippet owner="acme" repo="tools" label="Repository Quality" />,
      );

      const expectedSnippet =
        "[![Repository Quality](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/acme/tools)](https://repodoc.dev/report/acme/tools)";

      expect(screen.getByText(expectedSnippet)).toBeDefined();
    });
  });

  describe("Badge Preview Visual Thresholds", () => {
    const thresholdCases = [
      {
        score: 95,
        expectedColor: "brightgreen",
        hex: BADGE_COLOR_PALETTE.brightgreen.hex,
        label: "Excellent",
      },
      {
        score: 80,
        expectedColor: "green",
        hex: BADGE_COLOR_PALETTE.green.hex,
        label: "Good",
      },
      {
        score: 65,
        expectedColor: "yellow",
        hex: BADGE_COLOR_PALETTE.yellow.hex,
        label: "Fair",
      },
      {
        score: 50,
        expectedColor: "orange",
        hex: BADGE_COLOR_PALETTE.orange.hex,
        label: "Needs Improvement",
      },
      {
        score: 25,
        expectedColor: "red",
        hex: BADGE_COLOR_PALETTE.red.hex,
        label: "Critical",
      },
    ];

    thresholdCases.forEach(({ score, expectedColor, hex, label }) => {
      it(`renders score ${score} with badge color "${expectedColor}" (${hex}) and rating label "${label}"`, () => {
        render(<BadgeSnippet owner="test" repo="repo" score={score} />);

        const scoreElement = screen.getByTestId("badge-preview-score");
        expect(scoreElement.textContent).toBe(`${score}/100`);
        expect(scoreElement.getAttribute("data-badge-color")).toBe(
          expectedColor,
        );
        expect(scoreElement.getAttribute("data-badge-hex")).toBe(hex);

        expect(screen.getByText(label)).toBeDefined();
      });
    });

    it("renders fallback display when score is not provided", () => {
      render(<BadgeSnippet owner="test" repo="repo" />);

      const scoreElement = screen.getByTestId("badge-preview-score");
      expect(scoreElement.textContent).toBe("not audited");
      expect(scoreElement.getAttribute("data-badge-color")).toBeNull();
    });
  });

  describe("Acceptance Criteria: Copy-to-Clipboard Functionality", () => {
    it("copies markdown snippet to clipboard when Copy button is clicked", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const onCopyMock = vi.fn();

      render(
        <BadgeSnippet owner="facebook" repo="react" onCopy={onCopyMock} />,
      );

      const copyButton = screen.getByRole("button", {
        name: /copy markdown snippet/i,
      });
      expect(copyButton).toBeDefined();

      fireEvent.click(copyButton);

      const expectedSnippet =
        "[![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/facebook/react)](https://repodoc.dev/report/facebook/react)";

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(expectedSnippet);
      });

      expect(onCopyMock).toHaveBeenCalledWith(expectedSnippet, "markdown");

      // Verify copied visual state
      expect(screen.getByText("Copied")).toBeDefined();

      // Verify screen reader status
      const statusElement = screen.getByRole("status");
      expect(statusElement.textContent).toContain(
        "Copied markdown embed snippet to clipboard",
      );
    });

    it("resets copied feedback state after timeout", async () => {
      vi.useFakeTimers();

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<BadgeSnippet owner="facebook" repo="react" />);

      const copyButton = screen.getByRole("button", {
        name: /copy markdown snippet/i,
      });
      fireEvent.click(copyButton);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Copied")).toBeDefined();

      // Fast-forward 2000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText("Copied")).toBeNull();
      expect(screen.getByText("Copy Markdown")).toBeDefined();

      vi.useRealTimers();
    });

    it("falls back to document.execCommand when navigator.clipboard is unavailable", async () => {
      // Remove navigator.clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const execMock = vi.fn().mockReturnValue(true);
      (document as unknown as { execCommand: typeof execMock }).execCommand =
        execMock;

      const copied = await copyToClipboard("test-text");
      expect(copied).toBe(true);
      expect(execMock).toHaveBeenCalledWith("copy");

      delete (document as unknown as { execCommand?: unknown }).execCommand;
    });
  });

  describe("Format Tab Switching (Markdown, HTML, Image URL)", () => {
    it("switches to HTML tab and displays HTML snippet", () => {
      render(<BadgeSnippet owner="vercel" repo="swr" />);

      const htmlTab = screen.getByRole("tab", { name: "HTML" });
      fireEvent.click(htmlTab);

      expect(htmlTab.getAttribute("aria-selected")).toBe("true");

      const expectedHtml =
        '<a href="https://repodoc.dev/report/vercel/swr"><img src="https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/vercel/swr" alt="Repo Health" /></a>';

      expect(screen.getByText(expectedHtml)).toBeDefined();

      // Button now says "Copy HTML"
      expect(
        screen.getByRole("button", { name: /copy html snippet/i }),
      ).toBeDefined();
    });

    it("switches to Image URL tab and displays direct Shields.io URL", () => {
      render(<BadgeSnippet owner="vercel" repo="swr" />);

      const urlTab = screen.getByRole("tab", { name: "Image URL" });
      fireEvent.click(urlTab);

      expect(urlTab.getAttribute("aria-selected")).toBe("true");

      const expectedUrl =
        "https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/vercel/swr";

      expect(screen.getByText(expectedUrl)).toBeDefined();
      expect(
        screen.getByRole("button", { name: /copy url snippet/i }),
      ).toBeDefined();
    });

    it("copies HTML snippet when on HTML tab", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<BadgeSnippet owner="vercel" repo="swr" defaultFormat="html" />);

      const copyButton = screen.getByRole("button", {
        name: /copy html snippet/i,
      });
      fireEvent.click(copyButton);

      const expectedHtml =
        '<a href="https://repodoc.dev/report/vercel/swr"><img src="https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/vercel/swr" alt="Repo Health" /></a>';

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith(expectedHtml);
      });
    });

    it("supports controlled format prop and onFormatChange callback", () => {
      const onFormatChange = vi.fn();
      const { rerender } = render(
        <BadgeSnippet
          owner="vercel"
          repo="swr"
          format="markdown"
          onFormatChange={onFormatChange}
        />,
      );

      const htmlTab = screen.getByRole("tab", { name: "HTML" });
      fireEvent.click(htmlTab);

      expect(onFormatChange).toHaveBeenCalledWith("html");

      // Rerender with new format controlled
      rerender(
        <BadgeSnippet
          owner="vercel"
          repo="swr"
          format="html"
          onFormatChange={onFormatChange}
        />,
      );

      expect(htmlTab.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("Accessibility and Keyboard Navigation", () => {
    it("gives multiple instances independent tab and panel associations", () => {
      const { container } = render(
        <>
          <BadgeSnippet owner="first" repo="repo" />
          <BadgeSnippet owner="second" repo="repo" />
        </>,
      );
      const ids = Array.from(
        container.querySelectorAll("[id]"),
        (element) => element.id,
      );
      expect(new Set(ids).size).toBe(ids.length);
      for (const panel of screen.getAllByRole("tabpanel")) {
        const tab = document.getElementById(
          panel.getAttribute("aria-labelledby")!,
        );
        expect(tab?.getAttribute("aria-controls")).toBe(panel.id);
      }
    });

    it("selects formats with arrow keys, Home and End", async () => {
      render(<BadgeSnippet owner="owner" repo="repo" />);
      const markdown = screen.getByRole("tab", { name: "Markdown" });
      const html = screen.getByRole("tab", { name: "HTML" });
      const url = screen.getByRole("tab", { name: "Image URL" });
      await act(async () => markdown.focus());
      await act(async () => fireEvent.keyDown(markdown, { key: "ArrowRight" }));
      expect(document.activeElement).toBe(html);
      expect(html.getAttribute("aria-selected")).toBe("true");
      await act(async () => fireEvent.keyDown(html, { key: "End" }));
      expect(document.activeElement).toBe(url);
      await act(async () => fireEvent.keyDown(url, { key: "ArrowRight" }));
      expect(document.activeElement).toBe(markdown);
      await act(async () => fireEvent.keyDown(markdown, { key: "ArrowLeft" }));
      expect(document.activeElement).toBe(url);
      await act(async () => fireEvent.keyDown(url, { key: "Home" }));
      expect(document.activeElement).toBe(markdown);
      expect(markdown.getAttribute("tabindex")).toBe("0");
      expect(html.getAttribute("tabindex")).toBe("-1");
    });

    it("renders accessible tablist, tabs, and tabpanel", () => {
      render(<BadgeSnippet owner="owner" repo="repo" />);

      const tablist = screen.getByRole("tablist", {
        name: /embed snippet format/i,
      });
      expect(tablist).toBeDefined();

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);

      const tabpanel = screen.getByRole("tabpanel");
      expect(tabpanel).toBeDefined();
      const activeTab = screen.getByRole("tab", { name: "Markdown" });
      expect(tabpanel.getAttribute("aria-labelledby")).toBe(activeTab.id);
      expect(activeTab.getAttribute("aria-controls")).toBe(tabpanel.id);
    });

    it("code snippet container has tabIndex=0 for keyboard accessibility", () => {
      render(<BadgeSnippet owner="owner" repo="repo" />);

      const pre = screen.getByLabelText(/markdown code snippet/i);
      expect(pre).toBeDefined();
      expect(pre.getAttribute("tabIndex")).toBe("0");
    });

    it("preview link has clear accessible label and external link attributes", () => {
      render(<BadgeSnippet owner="facebook" repo="react" score={92} />);

      const previewLink = screen.getByTestId("badge-preview-link");
      expect(previewLink.getAttribute("aria-label")).toContain(
        "Preview badge for facebook/react",
      );
      expect(previewLink.getAttribute("target")).toBe("_blank");
      expect(previewLink.getAttribute("rel")).toContain("noopener");
    });
  });

  describe("Safe embed generation and score inputs", () => {
    it.each([
      "javascript:alert(1)",
      "data:text/html,test",
      "/relative",
      "not a URL",
      "https://user:password@example.com",
    ])("rejects unsafe base URL %s", (baseUrl) => {
      expect(sanitizeBaseUrl(baseUrl)).toBe(DEFAULT_BASE_URL);
      expect(buildReportUrl({ owner: "acme", repo: "tool", baseUrl })).toBe(
        `${DEFAULT_BASE_URL}/report/acme/tool`,
      );
    });

    it("removes query strings and fragments while preserving deployment paths", () => {
      expect(
        sanitizeBaseUrl(" https://example.com/tools/?draft=1#preview "),
      ).toBe("https://example.com/tools");
      expect(sanitizeBaseUrl("http://localhost:3000/")).toBe(
        "http://localhost:3000",
      );
    });

    it("preserves escaped repository names in the nested endpoint URL", () => {
      const options = { owner: "acme", repo: "a&b" };
      expect(new URL(buildShieldsUrl(options)).searchParams.get("url")).toBe(
        buildBadgeEndpointUrl(options),
      );
    });

    it.each([".", "..", " /../ "])(
      "prevents a dot segment from traversing generated routes: %s",
      (repo) => {
        expect(buildReportUrl({ owner: "acme", repo })).toBe(
          "https://repodoc.dev/report/acme/repo",
        );
      },
    );

    it("escapes Markdown labels and URL parentheses without adding another link", () => {
      const snippet = buildMarkdownSnippet({
        owner: "acme",
        repo: "tool",
        label: "Repo [health]\\score\nnext",
        baseUrl: "https://example.com/(preview)",
      });
      expect(
        snippet.startsWith(String.raw`[![Repo \[health\]\\score next](`),
      ).toBe(true);
      expect(snippet).toContain("%28preview%29");
      expect(snippet).not.toContain("\n");
      expect(snippet).not.toContain("(preview)");
    });

    it("escapes HTML attributes so custom labels cannot inject markup", () => {
      const label = 'Health"><script>alert("test")</script> & score';
      const options = {
        owner: "acme",
        repo: "tool",
        label,
        baseUrl: "https://example.com/a&b",
      };
      const document = new DOMParser().parseFromString(
        buildHtmlSnippet(options),
        "text/html",
      );
      expect(document.querySelectorAll("script")).toHaveLength(0);
      expect(document.querySelectorAll("img")).toHaveLength(1);
      expect(document.querySelector("img")?.getAttribute("alt")).toBe(label);
      expect(document.querySelector("a")?.getAttribute("href")).toBe(
        buildReportUrl(options),
      );
      expect(document.querySelector("img")?.getAttribute("src")).toBe(
        buildShieldsUrl(options),
      );
    });

    it.each([0, 39, 40, 59, 60, 74, 75, 89, 90, 100])(
      "matches the endpoint at score boundary %s",
      (score) => {
        render(<BadgeSnippet owner="acme" repo="tool" score={score} />);
        const expected =
          score >= 90
            ? "brightgreen"
            : score >= 75
              ? "green"
              : score >= 60
                ? "yellow"
                : score >= 40
                  ? "orange"
                  : "red";
        expect(
          screen
            .getByTestId("badge-preview-score")
            .getAttribute("data-badge-color"),
        ).toBe(expected);
      },
    );

    it.each([NaN, Infinity, -Infinity])(
      "renders an unavailable score without claiming a healthy badge: %s",
      (score) => {
        render(<BadgeSnippet owner="acme" repo="tool" score={score} />);
        expect(screen.getByTestId("badge-preview-score").textContent).toBe(
          "not audited",
        );
        expect(
          screen
            .getByTestId("badge-preview-score")
            .getAttribute("data-badge-color"),
        ).toBeNull();
      },
    );

    it.each([
      [-5, 0],
      [150, 100],
      [74.5, 75],
    ])("normalizes score %s to %s", (score, normalized) => {
      render(<BadgeSnippet owner="acme" repo="tool" healthScore={score} />);
      expect(screen.getByTestId("badge-preview-score").textContent).toBe(
        `${normalized}/100`,
      );
    });

    it("uses the endpoint label in the preview while treating a custom label as alt text", () => {
      render(
        <BadgeSnippet
          owner="acme"
          repo="tool"
          label="Repository Quality"
          score={92}
        />,
      );
      expect(screen.getByTestId("badge-preview-link").textContent).toContain(
        "repo health",
      );
      expect(
        screen.getByText(
          buildMarkdownSnippet({
            owner: "acme",
            repo: "tool",
            label: "Repository Quality",
          }),
        ),
      ).toBeDefined();
    });
  });

  describe("Clipboard failures and asynchronous feedback", () => {
    function mockClipboard(writeText: (text: string) => Promise<void>) {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
    }

    function mockLegacyClipboard(implementation: () => boolean) {
      Object.defineProperty(document, "execCommand", {
        value: vi.fn(implementation),
        configurable: true,
      });
    }

    it("falls back after permission denial and restores keyboard focus", async () => {
      mockClipboard(vi.fn().mockRejectedValue(new Error("Permission denied")));
      mockLegacyClipboard(() => true);
      render(<BadgeSnippet owner="acme" repo="tool" />);
      const button = screen.getByRole("button", {
        name: /copy markdown snippet/i,
      });
      button.focus();
      fireEvent.click(button);
      await waitFor(() => expect(screen.getByText("Copied")).toBeDefined());
      expect(document.activeElement).toBe(button);
      expect(document.querySelector("textarea")).toBeNull();
    });

    it.each([false, "throws"])(
      "offers manual copy when the legacy clipboard %s",
      async (result) => {
        mockClipboard(
          vi.fn().mockRejectedValue(new Error("Permission denied")),
        );
        mockLegacyClipboard(() => {
          if (result === "throws") throw new Error("Unavailable");
          return false;
        });
        const onCopy = vi.fn();
        render(<BadgeSnippet owner="acme" repo="tool" onCopy={onCopy} />);
        const button = screen.getByRole("button", {
          name: /copy markdown snippet/i,
        });
        button.focus();
        fireEvent.click(button);
        await waitFor(() =>
          expect(screen.getByRole("status").textContent).toContain(
            "Copy failed. Select the snippet",
          ),
        );
        expect(document.querySelector("textarea")).toBeNull();
        expect(document.activeElement).toBe(button);
        expect(button.getAttribute("aria-describedby")).toBe(
          screen.getByRole("status").id,
        );
        expect(screen.queryByText("Copied")).toBeNull();
        expect(onCopy).not.toHaveBeenCalled();
      },
    );

    it("clears success when a different format is selected", async () => {
      mockClipboard(vi.fn().mockResolvedValue(undefined));
      render(<BadgeSnippet owner="acme" repo="tool" />);
      fireEvent.click(
        screen.getByRole("button", { name: /copy markdown snippet/i }),
      );
      await waitFor(() => expect(screen.getByText("Copied")).toBeDefined());
      fireEvent.click(screen.getByRole("tab", { name: "HTML" }));
      expect(screen.queryByText("Copied")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
    });

    it("does not claim a replacement repository was copied after an older copy resolves", async () => {
      let finishCopy!: () => void;
      mockClipboard(
        vi.fn(
          () =>
            new Promise<void>((resolve) => {
              finishCopy = resolve;
            }),
        ),
      );
      const { rerender } = render(<BadgeSnippet owner="acme" repo="old" />);
      fireEvent.click(
        screen.getByRole("button", { name: /copy markdown snippet/i }),
      );
      rerender(<BadgeSnippet owner="acme" repo="new" />);
      await act(async () => finishCopy());
      expect(screen.queryByText("Copied")).toBeNull();
      expect(screen.getByRole("status").textContent).toBe("");
      expect(
        screen.getByText(buildMarkdownSnippet({ owner: "acme", repo: "new" })),
      ).toBeDefined();
    });

    it("waits for clipboard completion and prevents duplicate writes", async () => {
      let finishCopy!: () => void;
      const writeText = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishCopy = resolve;
          }),
      );
      mockClipboard(writeText);
      render(<BadgeSnippet owner="acme" repo="tool" />);
      const button = screen.getByRole("button", {
        name: /copy markdown snippet/i,
      });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(button.getAttribute("aria-busy")).toBe("true");
      expect(screen.queryByText("Copied")).toBeNull();
      await act(async () => finishCopy());
      expect(screen.getByText("Copied")).toBeDefined();
    });

    it("gives a repeated copy the full feedback duration", async () => {
      vi.useFakeTimers();
      mockClipboard(vi.fn().mockResolvedValue(undefined));
      render(<BadgeSnippet owner="acme" repo="tool" />);
      fireEvent.click(
        screen.getByRole("button", { name: /copy markdown snippet/i }),
      );
      await act(async () => {});
      act(() => vi.advanceTimersByTime(1000));
      fireEvent.click(screen.getByRole("button", { name: /copied snippet/i }));
      await act(async () => {});
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByText("Copied")).toBeDefined();
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.queryByText("Copied")).toBeNull();
    });

    it("ignores a clipboard completion after unmount", async () => {
      let finishCopy!: () => void;
      mockClipboard(
        vi.fn(
          () =>
            new Promise<void>((resolve) => {
              finishCopy = resolve;
            }),
        ),
      );
      const onCopy = vi.fn();
      const { unmount } = render(
        <BadgeSnippet owner="acme" repo="tool" onCopy={onCopy} />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: /copy markdown snippet/i }),
      );
      unmount();
      await act(async () => finishCopy());
      expect(onCopy).not.toHaveBeenCalled();
    });
  });
});
