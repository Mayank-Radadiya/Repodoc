"use client";

import React, { useState, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpRight, GitFork } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  /** Hero presentation with a prominent repository composer. */
  appearance?: "default" | "hero";
  /** Repository shortcuts that fill the field without submitting it. */
  examples?: readonly string[];
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
  appearance = "default",
  examples,
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
  const reduceMotion = useReducedMotion();

  const inFlight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
      className={cn("flex flex-col gap-2 w-full outline-none", className)}
      aria-busy={isLoading}
      data-appearance={appearance}
      noValidate
    >
      <label htmlFor={generatedId} className="text-sm font-medium">
        {label}
      </label>
      <div data-slot="repository-field" className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div data-slot="repository-input" className="relative min-w-0 flex-1">
          {appearance === "hero" && (
            <GitFork data-slot="repository-icon" size={21} aria-hidden="true" />
          )}
          <Input
            ref={inputRef}
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
              "min-h-11 w-full text-base transition-colors [&_input]:min-h-11 [&_input]:outline-none [&_input]:focus:outline-none [&_input]:focus-visible:outline-none",
              error &&
                "border-destructive text-destructive-foreground focus-visible:ring-destructive/20",
            )}
          />
        </div>
        <Button
          render={appearance === "hero" ? (
            <motion.button
              tabIndex={0}
              whileHover={reduceMotion ? undefined : { scale: 1.015 }}
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            />
          ) : undefined}
          type="submit"
          loading={isLoading}
          disabled={disabled || isLoading}
          className="min-h-11 shrink-0"
        >
          <span data-slot="repository-submit-label">
            {appearance === "hero" ? "Audit repository" : "Audit"}
          </span>
          {appearance === "hero" && <ArrowUpRight aria-hidden="true" />}
        </Button>
      </div>
      {examples && examples.length > 0 && (
        <div data-slot="repository-examples" className="flex flex-wrap items-center gap-2">
          <span className="text-xs">Try a repo</span>
          {examples.map((example) => {
            const shorthand = example.replace(/^github\.com\//, "");
            return (
              <button
                key={example}
                type="button"
                disabled={disabled || isLoading}
                onClick={() => {
                  setValue(shorthand);
                  setError(null);
                  inputRef.current?.focus();
                }}
                className="min-h-11 cursor-pointer rounded-md px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shorthand}
              </button>
            );
          })}
        </div>
      )}
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
