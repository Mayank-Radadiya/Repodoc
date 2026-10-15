"use client";

import React, { useState, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { cn, parseGitHubUrl, type ParsedGitHubUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestAudit } from "@/src/lib/request-audit";
import type { AuditReport, PersistedAuditReport } from "@/src/lib/types";

export interface UrlInputProps {
  /** Visible, associated field label. */
  label?: string;
  /** Initial value in the input field. */
  initialValue?: string;
  /** Custom placeholder string. */
  placeholder?: string;
  /** Additional CSS class names for the container form. */
  className?: string;
  /** Automatically focus the input on mount. */
  autoFocus?: boolean;
  /** Whether the input and submit button are disabled. */
  disabled?: boolean;
  /** Automatically navigate to `/report/{owner}/{repo}` on successful audit. Defaults to true. */
  redirectToReport?: boolean;
  /** Optional custom router to override Next.js useRouter. */
  router?: { push: (url: string) => void };
  /** Callback fired when an audit completes successfully. */
  onAuditSuccess?: (
    report: PersistedAuditReport | AuditReport,
    parsed: ParsedGitHubUrl,
  ) => void;
  /** Callback fired when an audit fails (validation error or API error). */
  onAuditError?: (errorMessage: string) => void;
  /** Optional custom fetch implementation (useful for tests or mocking). */
  fetcher?: typeof fetch;
}

export function UrlInput({
  label = "GitHub Repository URL",
  initialValue = "",
  placeholder = "e.g. facebook/react or https://github.com/facebook/react",
  className,
  autoFocus = false,
  disabled = false,
  redirectToReport = true,
  router,
  onAuditSuccess,
  onAuditError,
  fetcher,
}: UrlInputProps): React.ReactElement {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inFlight = useRef(false);
  const generatedId = useId();
  const errorId = `${generatedId}-error`;

  let nextRouter: { push: (url: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nextRouter = useRouter();
  } catch {
    // Graceful fallback when rendered outside Next.js AppRouterContext (e.g., in unit tests)
  }
  const activeRouter = router ?? nextRouter;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled || inFlight.current) {
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      const msg =
        "Please enter a GitHub repository URL or owner/repo shorthand.";
      setError(msg);
      onAuditError?.(msg);
      return;
    }

    const parsed = parseGitHubUrl(trimmed);
    if (!parsed) {
      const msg =
        "Invalid repository format. Enter 'owner/repo' or a valid GitHub repository URL.";
      setError(msg);
      onAuditError?.(msg);
      return;
    }

    inFlight.current = true;
    setError(null);
    setIsLoading(true);

    try {
      const report = await requestAudit(parsed, { fetcher });
      onAuditSuccess?.(report, parsed);

      if (redirectToReport) {
        activeRouter?.push(
          `/report/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
        );
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error && err.message
          ? err.message
          : "Unable to complete audit. Network error.";
      setError(errorMsg);
      onAuditError?.(errorMsg);
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-2 w-full", className)}
      aria-busy={isLoading}
      noValidate
    >
      <label htmlFor={generatedId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Input
            id={generatedId}
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            autoFocus={autoFocus}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "min-h-11 w-full text-base transition-colors [&_input]:min-h-11",
              error &&
                "border-destructive text-destructive-foreground focus-visible:ring-destructive/20",
            )}
          />
        </div>
        <Button
          type="submit"
          loading={isLoading}
          disabled={disabled || isLoading}
          className="min-h-11 shrink-0"
        >
          Audit
        </Button>
      </div>
      {isLoading && (
        <p role="status" className="text-sm">
          Auditing repository…
        </p>
      )}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive font-medium "
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
