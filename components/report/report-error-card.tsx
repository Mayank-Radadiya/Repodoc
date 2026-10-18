import React from "react";
import Link from "next/link";
import { AlertCircle, Clock, SearchX, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReportErrorKind =
  "rate_limited" | "not_found" | "network" | "bad_input" | "server_error";

export interface ClassifiedReportError {
  kind: ReportErrorKind;
  title: string;
  message: string;
  suggestion: string;
}

export function classifyReportError(error: unknown): ClassifiedReportError {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const lower = text.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return {
      kind: "rate_limited",
      title: "GitHub rate limit reached",
      message:
        "GitHub's public API limits unauthenticated requests to 60 per hour.",
      suggestion:
        "Rate limits reset every hour. Please wait a short while before trying again.",
    };
  }

  if (
    lower.includes("not found") ||
    lower.includes("inaccessible") ||
    lower.includes("404")
  ) {
    return {
      kind: "not_found",
      title: "Repository not found or inaccessible",
      message:
        "The requested repository could not be located on GitHub. It may be private, misspelled, or deleted.",
      suggestion:
        "Verify the owner and repository name spelling, or ensure the repository is public.",
    };
  }

  if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("offline") ||
    lower.includes("connection") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed")
  ) {
    return {
      kind: "network",
      title: "Unable to connect",
      message:
        "Could not establish a connection to the audit service or GitHub.",
      suggestion:
        "Please check your internet connection and try your audit again.",
    };
  }

  if (
    lower.includes("invalid") ||
    lower.includes("malformed") ||
    lower.includes("400")
  ) {
    return {
      kind: "bad_input",
      title: "Invalid repository address",
      message:
        text || "The supplied repository coordinates or URL format is invalid.",
      suggestion:
        "Use a format like 'owner/repo' or paste a valid GitHub repository URL.",
    };
  }

  return {
    kind: "server_error",
    title: "Audit temporarily unavailable",
    message:
      text ||
      "An unexpected error occurred while communicating with GitHub or processing the audit.",
    suggestion:
      "This is usually temporary. Please wait a moment and try again.",
  };
}

export interface ReportErrorCardProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  context?: string;
  className?: string;
  previousReportShown?: boolean;
  retryLabel?: string;
}

export function ReportErrorCard({
  error,
  onRetry,
  title,
  context,
  className = "",
  previousReportShown = false,
  retryLabel = "Try again",
}: ReportErrorCardProps) {
  const classified = classifyReportError(error);
  const displayTitle = title || classified.title;
  const rawError =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const iconMap: Record<ReportErrorKind, React.ReactNode> = {
    rate_limited: (
      <Clock
        className="size-6 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    ),
    not_found: (
      <SearchX
        className="size-6 text-blue-600 dark:text-blue-400"
        aria-hidden="true"
      />
    ),
    network: (
      <WifiOff
        className="size-6 text-rose-600 dark:text-rose-400"
        aria-hidden="true"
      />
    ),
    bad_input: (
      <AlertCircle
        className="size-6 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
    ),
    server_error: (
      <AlertCircle
        className="size-6 text-rose-600 dark:text-rose-400"
        aria-hidden="true"
      />
    ),
  };

  return (
    <div
      role="alert"
      className={`rounded-[16px] border border-border bg-card p-6 sm:p-8 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          {iconMap[classified.kind]}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {displayTitle}
          </h2>
          {context && (
            <p className="mt-1 font-mono text-sm break-words text-muted-foreground">
              {context}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {classified.message}
          </p>
          {rawError && rawError !== classified.message && (
            <p className="mt-2 font-mono text-xs break-words text-muted-foreground">
              {rawError}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {classified.suggestion}
          </p>
          {previousReportShown && (
            <p className="mt-3 rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
              The previous report is still shown.
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="min-h-11 px-5">
                {retryLabel}
              </Button>
            )}
            <Link
              href="/#hero"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              Audit another repository
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
