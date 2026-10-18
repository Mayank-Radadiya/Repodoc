"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PersistedAuditReport } from "@/lib/types";
import { isPersistedAuditReport } from "@/lib/report-validation";
import { buildShareUrl, copyToClipboard } from "./badge-snippet";
import { ReportView } from "./report-view";
import { ReportPending } from "./report-pending";
import { ReportErrorCard } from "./report-error-card";

export interface ShareControllerProps {
  shareId: string;
  initialReport?: PersistedAuditReport | null;
}

export function ShareController(props: ShareControllerProps) {
  return <ShareSession key={props.shareId} {...props} />;
}

function ShareSession({ shareId, initialReport = null }: ShareControllerProps) {
  const [report, setReport] = useState<PersistedAuditReport | null>(
    initialReport,
  );
  const [pending, setPending] = useState(!initialReport);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const copying = useRef(false);

  const loadReport = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/report/${encodeURIComponent(shareId)}`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ||
            "Unable to load this shared report. It may have expired or does not exist.",
        );
      }
      const data = await response.json();
      if (!isPersistedAuditReport(data)) {
        throw new Error("Invalid report format received from server.");
      }
      if (mounted.current && request.current === controller) {
        setReport(data);
      }
    } catch (cause) {
      if (
        mounted.current &&
        !controller.signal.aborted &&
        request.current === controller
      ) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to retrieve the shared report.",
        );
      }
    } finally {
      if (mounted.current && request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }, [shareId]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    queueMicrotask(() => {
      if (!active) return;
      setOrigin(window.location.origin);
      if (!initialReport) void loadReport();
    });
    return () => {
      active = false;
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [initialReport, loadReport]);

  const shareUrl = origin
    ? buildShareUrl({ shareId: report?.shareId || shareId, baseUrl: origin })
    : "";

  const share = async () => {
    if (copying.current || !shareUrl) return;
    copying.current = true;
    setCopyStatus("copying");
    const copied = await copyToClipboard(shareUrl);
    if (mounted.current) setCopyStatus(copied ? "copied" : "error");
    copying.current = false;
  };

  const feedback = (
    <div className="space-y-3 [&>p:empty]:hidden">
      {error && (
        <ReportErrorCard
          error={error}
          title="Unable to load this shared report"
          onRetry={() => void loadReport()}
          context={`Share ID: ${shareId}`}
          retryLabel="Try loading again"
          className="mb-4"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-info-foreground">
          <span
            className="size-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          Shared snapshot (read-only)
        </span>
        <p
          role="status"
          aria-atomic="true"
          className="text-sm text-muted-foreground"
        >
          {copyStatus === "copied"
            ? "Share link copied."
            : copyStatus === "error"
              ? "Could not copy the share link. Select the link below to copy it manually."
              : ""}
        </p>
      </div>
      {copyStatus === "error" && (
        <div className="space-y-2 text-sm">
          <label htmlFor="share-page-url" className="block font-medium">
            Copy the share link manually
          </label>
          <Input
            id="share-page-url"
            nativeInput
            readOnly
            value={shareUrl}
            onFocus={(event) => event.target.select()}
            className="min-h-11"
          />
        </div>
      )}
    </div>
  );

  if (!report) {
    return (
      <>
        {pending ? (
          <ReportPending message="Loading shared report…" />
        ) : (
          <ReportErrorCard
            error={error || "Unable to load this shared report."}
            title="Unable to load this shared report"
            onRetry={() => void loadReport()}
            context={`Share ID: ${shareId}`}
            retryLabel="Try loading again"
            className="max-w-2xl"
          />
        )}
      </>
    );
  }

  return (
    <ReportView
      report={report}
      baseUrl={origin}
      feedback={feedback}
      actions={
        <>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!origin || copyStatus === "copying"}
            onClick={() => void share()}
          >
            <Copy aria-hidden="true" />
            {copyStatus === "copied" ? "Link copied" : "Copy share link"}
          </Button>
          <Link
            href={`/report/${encodeURIComponent(report.owner)}/${encodeURIComponent(report.repo)}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            View live report
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </Link>
        </>
      }
    />
  );
}
