import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ReportErrorCard,
  classifyReportError,
} from "../report-error-card";

describe("ReportErrorCard and classifyReportError", () => {
  describe("classifyReportError", () => {
    it("classifies 429 and rate limit messages as rate_limited", () => {
      const result = classifyReportError("GitHub API rate limit exceeded. Try again later.");
      expect(result.kind).toBe("rate_limited");
      expect(result.title).toContain("rate limit");
    });

    it("classifies 404 and not found messages as not_found", () => {
      const result = classifyReportError("GitHub repository or resource was not found or is inaccessible.");
      expect(result.kind).toBe("not_found");
      expect(result.title).toContain("not found");
    });

    it("classifies network errors as network", () => {
      const result = classifyReportError(new TypeError("Failed to fetch"));
      expect(result.kind).toBe("network");
      expect(result.title).toContain("connect");
    });

    it("classifies unexpected errors as server_error", () => {
      const result = classifyReportError("Unexpected server failure");
      expect(result.kind).toBe("server_error");
      expect(result.title).toBe("Audit temporarily unavailable");
    });
  });

  describe("component rendering", () => {
    it("renders friendly rate-limit guidance and executes retry action", () => {
      const onRetry = vi.fn();
      render(
        <ReportErrorCard
          error="GitHub API rate limit exceeded. Try again later."
          onRetry={onRetry}
          context="facebook/react"
        />,
      );

      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/GitHub rate limit reached/i)).toBeDefined();
      expect(screen.getByText(/facebook\/react/)).toBeDefined();
      expect(screen.getByText(/limits unauthenticated requests to 60 per hour/i)).toBeDefined();

      const retryButton = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);

      const homeLink = screen.getByRole("link", { name: /audit another repository/i });
      expect(homeLink.getAttribute("href")).toBe("/#hero");
    });

    it("renders not-found guidance with suggestions", () => {
      render(
        <ReportErrorCard
          error="GitHub repository or resource was not found or is inaccessible."
          context="owner/nonexistent"
        />,
      );

      expect(screen.getByText(/repository not found or inaccessible/i)).toBeDefined();
      expect(screen.getByText(/may be private, misspelled, or deleted/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /audit another repository/i })).toBeDefined();
    });

    it("renders network error guidance with connection advice", () => {
      render(
        <ReportErrorCard
          error={new TypeError("Failed to fetch")}
          onRetry={vi.fn()}
        />,
      );

      expect(screen.getByText(/unable to connect/i)).toBeDefined();
      expect(screen.getByText(/check your internet connection/i)).toBeDefined();
    });

    it("indicates when previous report is still displayed", () => {
      render(
        <ReportErrorCard
          error="Network timeout"
          previousReportShown
        />,
      );

      expect(screen.getByText(/The previous report is still shown\./i)).toBeDefined();
    });
  });
});
