import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ScoringEngine } from "@/lib/scoring/engine";
import { UrlInput } from "@/components/report/url-input";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("UrlInput component", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders input field and Audit button", () => {
    render(<UrlInput />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toBe(
      "e.g. facebook/react or https://github.com/facebook/react",
    );

    const button = screen.getByRole("button", { name: /audit/i });
    expect(button).toBeDefined();
  });

  it("renders initialValue when provided", () => {
    render(<UrlInput initialValue="vercel/next.js" />);
    const input = screen.getByRole("textbox", { name: /github repository/i }) as HTMLInputElement;
    expect(input.value).toBe("vercel/next.js");
  });

  it("renders custom placeholder when provided", () => {
    render(<UrlInput placeholder="Custom placeholder" />);
    const input = screen.getByRole("textbox", { name: /github repository/i });
    expect(input.getAttribute("placeholder")).toBe("Custom placeholder");
  });

  it("shows inline validation error when submitting empty input", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const onError = vi.fn();

    render(<UrlInput onAuditError={onError} />);
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Please enter a GitHub repository URL or owner/repo shorthand.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("Please enter a GitHub repository URL or owner/repo shorthand.");

    const input = screen.getByRole("textbox", { name: /github repository/i });
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("clears validation error when user modifies the input", async () => {
    render(<UrlInput />);
    const button = screen.getByRole("button", { name: /audit/i });
    const input = screen.getByRole("textbox", { name: /github repository/i });

    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toBeDefined();

    fireEvent.change(input, { target: { value: "a" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("false");
  });

  it("shows inline validation error when submitting an invalid repository URL", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const onError = vi.fn();

    render(<UrlInput onAuditError={onError} />);
    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "https://gitlab.com/owner/repo" } });
    fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Invalid repository format. Enter 'owner/repo' or a valid GitHub repository URL.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "Invalid repository format. Enter 'owner/repo' or a valid GitHub repository URL.",
    );
  });

  it("shows inline validation error for invalid characters or single names", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    render(<UrlInput />);
    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "just-a-name" } });
    fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Invalid repository format");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits valid shorthand owner/repo and triggers audit API call", async () => {
    const mockReport = {
      owner: "facebook",
      repo: "react",
      defaultBranch: "main",
      healthScore: 0,
      rubricVersion: "1.0.0",
      checks: ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set() }).checks,
      generatedAt: new Date().toISOString(),
      shareId: "test1234",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReport,
    });
    global.fetch = fetchMock;

    const onSuccess = vi.fn();
    render(<UrlInput onAuditSuccess={onSuccess} />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "facebook/react" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: "facebook", repo: "react" }),
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockReport, { owner: "facebook", repo: "react" });
      expect(mockPush).toHaveBeenCalledWith("/report/facebook/react");
    });
  });

  it("submits full GitHub URL and triggers audit API call with parsed owner and repo", async () => {
    const mockReport = {
      owner: "octocat",
      repo: "Hello-World",
      defaultBranch: "master",
      healthScore: 0,
      rubricVersion: "1.0.0",
      checks: ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set() }).checks,
      generatedAt: new Date().toISOString(),
      shareId: "octo1234",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReport,
    });
    global.fetch = fetchMock;

    render(<UrlInput />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    fireEvent.change(input, { target: { value: "https://github.com/octocat/Hello-World.git" } });

    // Submit via form submit event (Enter key equivalent)
    const form = input.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: "octocat", repo: "Hello-World" }),
      });
      expect(mockPush).toHaveBeenCalledWith("/report/octocat/Hello-World");
    });
  });

  it("disables input and shows loading state during submission", async () => {
    let resolvePromise!: (val: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const fetchMock = vi.fn().mockReturnValue(pendingPromise);
    global.fetch = fetchMock;

    render(<UrlInput />);

    const input = screen.getByRole("textbox", { name: /github repository/i }) as HTMLInputElement;
    const button = screen.getByRole("button", { name: /audit/i }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: "torvalds/linux" } });
    fireEvent.click(button);

    // During fetch: button is loading and disabled
    await waitFor(() => {
      expect(button.getAttribute("data-loading")).toBe("");
      expect(button.disabled).toBe(true);
      expect(input.disabled).toBe(true);
    });

    // Complete fetch
    resolvePromise({
      ok: true,
      status: 200,
      json: async () => ({
        owner: "torvalds",
        repo: "linux",
        defaultBranch: "master",
        healthScore: 0,
        rubricVersion: "1.0.0",
        checks: ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set() }).checks,
        generatedAt: new Date().toISOString(),
        shareId: "test1234",
      }),
    });

    await waitFor(() => {
      expect(button.getAttribute("data-loading")).toBeNull();
      expect(button.disabled).toBe(false);
      expect(input.disabled).toBe(false);
    });
  });

  it("handles API error response (e.g. 404 repo not found) and displays inline error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: "GitHub repository or resource was not found or is inaccessible.",
      }),
    });
    global.fetch = fetchMock;

    const onError = vi.fn();
    render(<UrlInput onAuditError={onError} />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "fake-owner/non-existent-repo" } });
    fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("GitHub repository or resource was not found or is inaccessible.");
    expect(onError).toHaveBeenCalledWith(
      "GitHub repository or resource was not found or is inaccessible.",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("handles network failure and displays appropriate inline error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network connection dropped"));
    global.fetch = fetchMock;

    const onError = vi.fn();
    render(<UrlInput onAuditError={onError} />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "owner/repo" } });
    fireEvent.click(button);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Network connection dropped");
    expect(onError).toHaveBeenCalledWith("Network connection dropped");
  });

  it("does not navigate when redirectToReport is false", async () => {
    const mockReport = {
      owner: "facebook",
      repo: "react",
      defaultBranch: "main",
      healthScore: 0,
      rubricVersion: "1.0.0",
      checks: ScoringEngine.run({ owner: "owner", repo: "repo", paths: new Set() }).checks,
      generatedAt: new Date().toISOString(),
      shareId: "test1234",
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockReport,
    });
    global.fetch = fetchMock;

    const onSuccess = vi.fn();
    render(<UrlInput redirectToReport={false} onAuditSuccess={onSuccess} />);

    const input = screen.getByRole("textbox", { name: /github repository/i });
    const button = screen.getByRole("button", { name: /audit/i });

    fireEvent.change(input, { target: { value: "facebook/react" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("respects disabled prop", () => {
    render(<UrlInput disabled={true} />);

    const input = screen.getByRole("textbox", { name: /github repository/i }) as HTMLInputElement;
    const button = screen.getByRole("button", { name: /audit/i }) as HTMLButtonElement;

    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);
  });
});
