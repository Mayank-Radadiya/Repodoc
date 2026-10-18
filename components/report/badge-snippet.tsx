"use client";

import React, { useState, useId, useEffect, useRef } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import { BADGE_LABEL, getBadgeColor } from "@/src/lib/badge";
import {
  BADGE_COLOR_PALETTE,
  normalizeScore,
} from "@/components/report/score-gauge";
import type { AuditReport } from "@/src/lib/types";

export const DEFAULT_BASE_URL = "https://repodoc.dev";
export const DEFAULT_BADGE_LABEL = "Repo Health";

export type BadgeSnippetFormat = "markdown" | "html" | "url";

export interface GenerateBadgeUrlsOptions {
  owner: string;
  repo: string;
  baseUrl?: string;
  label?: string;
  encodeEndpointUrl?: boolean;
}

/**
 * Accepts HTTP(S) deployment URLs without credentials, query strings or fragments.
 */
export function sanitizeBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return DEFAULT_BASE_URL;
  try {
    const url = new URL(baseUrl.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return DEFAULT_BASE_URL;
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

/**
 * Sanitizes a repository owner or repo name string.
 */
export function sanitizeRepoCoordinate(value?: string, fallback = ""): string {
  if (!value) return fallback;
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed && trimmed !== "." && trimmed !== ".." ? trimmed : fallback;
}

/**
 * Generates the direct JSON badge endpoint URL on the Repodoc server.
 * Example: https://repodoc.dev/api/badge/facebook/react
 */
export function buildBadgeEndpointUrl(
  options: GenerateBadgeUrlsOptions,
): string {
  const base = sanitizeBaseUrl(options.baseUrl);
  const owner = encodeURIComponent(
    sanitizeRepoCoordinate(options.owner, "owner"),
  );
  const repo = encodeURIComponent(sanitizeRepoCoordinate(options.repo, "repo"));
  return `${base}/api/badge/${owner}/${repo}`;
}

/**
 * Generates the Shields.io dynamic endpoint badge image URL.
 * Example: https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/facebook/react
 */
export function buildShieldsUrl(options: GenerateBadgeUrlsOptions): string {
  const endpoint = buildBadgeEndpointUrl(options);
  // A nested URL containing escapes or query delimiters must survive query parsing.
  const urlParam =
    options.encodeEndpointUrl || /[%&?#]/.test(endpoint)
      ? encodeURIComponent(endpoint)
      : endpoint;
  return `https://img.shields.io/endpoint?url=${urlParam}`;
}

/**
 * Generates the target report URL for click-through navigation.
 * Example: https://repodoc.dev/report/facebook/react
 */
export function buildReportUrl(options: GenerateBadgeUrlsOptions): string {
  const base = sanitizeBaseUrl(options.baseUrl);
  const owner = encodeURIComponent(
    sanitizeRepoCoordinate(options.owner, "owner"),
  );
  const repo = encodeURIComponent(sanitizeRepoCoordinate(options.repo, "repo"));
  return `${base}/report/${owner}/${repo}`;
}

/**
 * Generates the shareable read-only report URL for a snapshot.
 * Example: https://repodoc.dev/share/test1234
 */
export function buildShareUrl(options: {
  shareId: string;
  baseUrl?: string;
}): string {
  const base = sanitizeBaseUrl(options.baseUrl);
  const shareId = encodeURIComponent((options.shareId || "").trim());
  return `${base}/share/${shareId}`;
}

/**
 * Generates the standard Markdown embed snippet as defined in idea.md:
 * [![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/owner/repo)](https://repodoc.dev/report/owner/repo)
 */
export function buildMarkdownSnippet(
  options: GenerateBadgeUrlsOptions,
): string {
  const label = (options.label?.trim() || DEFAULT_BADGE_LABEL)
    .replace(/[\r\n]+/g, " ")
    .replace(/[\\[\]]/g, "\\$&");
  const escapeDestination = (url: string) =>
    url.replace(
      /[\\()[\]]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  const shieldsUrl = escapeDestination(buildShieldsUrl(options));
  const reportUrl = escapeDestination(buildReportUrl(options));
  return `[![${label}](${shieldsUrl})](${reportUrl})`;
}

/**
 * Generates the standard HTML embed snippet.
 * <a href="https://repodoc.dev/report/owner/repo"><img src="https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/owner/repo" alt="Repo Health" /></a>
 */
export function buildHtmlSnippet(options: GenerateBadgeUrlsOptions): string {
  const escapeAttribute = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const label = escapeAttribute(options.label?.trim() || DEFAULT_BADGE_LABEL);
  const shieldsUrl = escapeAttribute(buildShieldsUrl(options));
  const reportUrl = escapeAttribute(buildReportUrl(options));
  return `<a href="${reportUrl}"><img src="${shieldsUrl}" alt="${label}" /></a>`;
}

/**
 * Retrieves the code snippet for the specified format.
 */
export function getSnippetForFormat(
  format: BadgeSnippetFormat,
  options: GenerateBadgeUrlsOptions,
): string {
  switch (format) {
    case "markdown":
      return buildMarkdownSnippet(options);
    case "html":
      return buildHtmlSnippet(options);
    case "url":
      return buildShieldsUrl(options);
    default:
      return buildMarkdownSnippet(options);
  }
}

/**
 * Safe clipboard copy utility with fallback for non-secure contexts or legacy browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Try the legacy clipboard when permission is denied or the API is unavailable.
  }

  if (typeof document === "undefined") return false;

  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : [];
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.tabIndex = -1;
  textArea.setAttribute("readonly", "");
  textArea.setAttribute("aria-hidden", "true");
  try {
    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    return Boolean(document.execCommand("copy"));
  } catch {
    return false;
  } finally {
    textArea.remove();
    if (activeElement instanceof HTMLElement) {
      activeElement.focus({ preventScroll: true });
    }
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}

export interface BadgeSnippetProps {
  /** Target repository owner. */
  owner?: string;
  /** Target repository name. */
  repo?: string;
  /** Full AuditReport object from which owner, repo, and healthScore can be derived. */
  report?: AuditReport;
  /** Known numeric health score (0-100) for preview rendering. */
  score?: number;
  /** Known numeric health score (alias for score). */
  healthScore?: number;
  /** Base origin URL for repodoc (e.g. "https://repodoc.dev"). */
  baseUrl?: string;
  /** Label for the badge in markdown alt text. Defaults to "Repo Health". */
  label?: string;
  /** Default active format. Defaults to "markdown". */
  defaultFormat?: BadgeSnippetFormat;
  /** Controlled active format. */
  format?: BadgeSnippetFormat;
  /** Callback when the active format changes. */
  onFormatChange?: (format: BadgeSnippetFormat) => void;
  /** Whether to percent-encode the endpoint URL in the Shields query param. */
  encodeEndpointUrl?: boolean;
  /** Optional custom copy callback. */
  onCopy?: (snippet: string, format: BadgeSnippetFormat) => void;
  /** Additional CSS class names. */
  className?: string;
}

const FORMATS: {
  value: BadgeSnippetFormat;
  label: string;
  copyLabel: string;
}[] = [
  { value: "markdown", label: "Markdown", copyLabel: "Markdown" },
  { value: "html", label: "HTML", copyLabel: "HTML" },
  { value: "url", label: "Image URL", copyLabel: "URL" },
];

type CopyFeedback = {
  snippet: string;
  format: BadgeSnippetFormat;
  status: "copying" | "copied" | "error";
};

export function BadgeSnippet({
  owner: propOwner,
  repo: propRepo,
  report,
  score: propScore,
  healthScore: propHealthScore,
  baseUrl,
  label = DEFAULT_BADGE_LABEL,
  defaultFormat = "markdown",
  format: controlledFormat,
  onFormatChange,
  encodeEndpointUrl = false,
  onCopy,
  className,
}: BadgeSnippetProps) {
  const resolvedOwner = sanitizeRepoCoordinate(
    propOwner ?? report?.owner,
    "owner",
  );
  const resolvedRepo = sanitizeRepoCoordinate(propRepo ?? report?.repo, "repo");
  const resolvedScore = propScore ?? propHealthScore ?? report?.healthScore;
  const [internalFormat, setInternalFormat] = useState(defaultFormat);
  const activeFormat = controlledFormat ?? internalFormat;
  const [feedback, setFeedback] = useState<CopyFeedback | null>(null);
  const titleId = useId();
  const statusId = useId();
  const mounted = useRef(true);
  const copyInFlight = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  const urlOptions: GenerateBadgeUrlsOptions = {
    owner: resolvedOwner,
    repo: resolvedRepo,
    baseUrl,
    label,
    encodeEndpointUrl,
  };
  const activeSnippet = getSnippetForFormat(activeFormat, urlOptions);
  const reportUrl = buildReportUrl(urlOptions);
  const currentFeedback = feedback?.snippet === activeSnippet ? feedback : null;
  const copied = currentFeedback?.status === "copied";
  const copyError = currentFeedback?.status === "error";
  const copying = feedback?.status === "copying";
  const copyLabel = FORMATS.find(
    ({ value }) => value === activeFormat,
  )!.copyLabel;

  const hasScore =
    typeof resolvedScore === "number" && Number.isFinite(resolvedScore);
  const normalizedScore = normalizeScore(resolvedScore);
  const badgeColor = getBadgeColor(normalizedScore);
  const badgePalette = BADGE_COLOR_PALETTE[badgeColor];
  const scoreDisplay = hasScore ? `${normalizedScore}/100` : "not audited";

  const handleFormatSelect = (value: unknown) => {
    const selected = FORMATS.find((format) => format.value === value);
    if (!selected) return;
    if (controlledFormat === undefined) setInternalFormat(selected.value);
    setFeedback((previous) =>
      previous?.status === "copying" ? previous : null,
    );
    onFormatChange?.(selected.value);
  };

  const handleCopy = async () => {
    if (copyInFlight.current) return;
    copyInFlight.current = true;
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    setFeedback({
      snippet: activeSnippet,
      format: activeFormat,
      status: "copying",
    });
    const success = await copyToClipboard(activeSnippet);
    copyInFlight.current = false;
    if (!mounted.current) return;
    setFeedback({
      snippet: activeSnippet,
      format: activeFormat,
      status: success ? "copied" : "error",
    });
    if (success) {
      resetTimer.current = setTimeout(() => setFeedback(null), 2000);
      onCopy?.(activeSnippet, activeFormat);
    }
  };

  return (
    <Card
      aria-labelledby={titleId}
      className={cn(
        "min-w-0 w-full overflow-hidden rounded-xl shadow-none before:shadow-none dark:before:shadow-none",
        className,
      )}
    >
      <CardHeader className="gap-2 p-5 pb-0 sm:p-6 sm:pb-0">
        <CardTitle
          render={<h2 id={titleId} />}
          className="text-sm leading-6 font-semibold"
        >
          Add a health badge
        </CardTitle>
        <CardDescription className="max-w-prose leading-relaxed">
          Copy this snippet into your README. The badge links to your report.
        </CardDescription>
      </CardHeader>

      <CardContent className="min-w-0 space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span>README.md</span>
            <span className="min-w-0 break-all">
              {resolvedOwner}/{resolvedRepo}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Preview badge for ${resolvedOwner}/${resolvedRepo}: ${hasScore ? `${normalizedScore} out of 100` : "score unavailable"}. Open report in a new tab.`}
                className="inline-flex min-h-11 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
                data-testid="badge-preview-link"
              >
                <span className="inline-flex overflow-hidden rounded-sm font-sans text-[11px] leading-5">
                  <span className="bg-slate-700 px-2 text-white">
                    {BADGE_LABEL}
                  </span>
                  <span
                    className={cn(
                      "px-2 font-semibold",
                      hasScore
                        ? "text-slate-950"
                        : "bg-muted text-muted-foreground",
                    )}
                    style={
                      hasScore
                        ? { backgroundColor: badgePalette.hex }
                        : undefined
                    }
                    data-testid="badge-preview-score"
                    data-badge-color={hasScore ? badgeColor : undefined}
                    data-badge-hex={hasScore ? badgePalette.hex : undefined}
                  >
                    {scoreDisplay}
                  </span>
                </span>
              </a>
              <span className="text-xs text-muted-foreground">
                {hasScore
                  ? badgePalette.label
                  : "Run an audit to see your score."}
              </span>
            </div>
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View report (opens in a new tab)"
              className="inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
            >
              View report
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <Tabs
          value={activeFormat}
          onValueChange={handleFormatSelect}
          className="min-w-0 gap-3 motion-reduce:[&_*]:transition-none"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList activateOnFocus aria-label="Embed snippet format">
              {FORMATS.map(({ value, label }) => (
                <TabsTab
                  key={value}
                  value={value}
                  className="min-h-11 px-2.5 text-sm focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 sm:min-h-11"
                >
                  {label}
                </TabsTab>
              ))}
            </TabsList>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              aria-disabled={copying}
              aria-busy={copying}
              aria-describedby={copyError ? statusId : undefined}
              aria-label={
                copied
                  ? "Copied snippet to clipboard"
                  : `Copy ${activeFormat} snippet`
              }
              className="min-h-11 gap-2 focus-visible:ring-blue-600 motion-reduce:transition-none dark:focus-visible:ring-blue-400 sm:min-h-11"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : copying ? "Copying…" : `Copy ${copyLabel}`}
            </Button>
          </div>
          {FORMATS.map(({ value }) => (
            <TabsPanel key={value} value={value} className="min-w-0">
              <pre
                tabIndex={0}
                aria-label={`${value} code snippet`}
                className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
              >
                <code className="select-all">
                  {getSnippetForFormat(value, urlOptions)}
                </code>
              </pre>
            </TabsPanel>
          ))}
        </Tabs>
        <span
          id={statusId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={
            copyError ? "block text-sm text-destructive-foreground" : "sr-only"
          }
        >
          {copied
            ? `Copied ${currentFeedback.format} embed snippet to clipboard`
            : copyError
              ? "Copy failed. Select the snippet above and copy it manually, or try again."
              : ""}
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The embedded badge refreshes from your repository, with results cached
          for one hour.
        </p>
      </CardContent>
    </Card>
  );
}
