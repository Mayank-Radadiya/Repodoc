"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestAudit } from "@/lib/request-audit";
import type { ParsedGitHubUrl, PersistedAuditReport } from "@/lib/types";
import { buildReportUrl, copyToClipboard } from "./badge-snippet";
import { ReportView } from "./report-view";
import { ReportPending } from "./report-pending";
import { ReportErrorCard } from "./report-error-card";
import { FixButton } from "./fix-button";
import { ReportShareMenu } from "./report-share-menu";

interface ReportControllerProps extends ParsedGitHubUrl {
  initialReport: PersistedAuditReport | null;
}

export function ReportController(props: ReportControllerProps) {
  // A repository navigation starts a new session, so old requests cannot replace it.
  return (
    <ReportSession
      key={`${props.owner.toLowerCase()}/${props.repo.toLowerCase()}`}
      {...props}
    />
  );
}

function ReportSession({ owner, repo, initialReport }: ReportControllerProps) {
  const [report, setReport] = useState(initialReport);
  const [pending, setPending] = useState(!initialReport);
  const [remediationPending, setRemediationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const copying = useRef(false);
  const reportRef = useRef(report);

  const runAudit = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    try {
      const result = await requestAudit(
        { owner, repo },
        { signal: controller.signal },
      );
      if (mounted.current && request.current === controller) {
        reportRef.current = result;
        setReport(result);
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
            : "Unable to audit this repository. Check your connection and try again.",
        );
      }
    } finally {
      if (mounted.current && request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }, [owner, repo]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    // Defer until committed; Strict Mode's discarded effect never starts an audit.
    queueMicrotask(() => {
      if (!active) return;
      setOrigin(window.location.origin);
      if (!request.current) setPending(false);
      if (!reportRef.current) void runAudit();
    });
    return () => {
      active = false;
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [initialReport, runAudit]);

  const reportUrl = origin
    ? buildReportUrl({ owner, repo, baseUrl: origin })
    : "";
  const share = async () => {
    if (copying.current || !reportUrl) return;
    copying.current = true;
    setCopyStatus("copying");
    const copied = await copyToClipboard(reportUrl);
    if (mounted.current) setCopyStatus(copied ? "copied" : "error");
    copying.current = false;
  };

  const feedback = (
    <div className="space-y-3 [&>p:empty]:hidden">
      {error && (
        <ReportErrorCard
          error={error}
          onRetry={() => void runAudit()}
          context={`${owner}/${repo}`}
          previousReportShown={Boolean(report)}
          retryLabel="Try audit again"
          className="mb-4"
        />
      )}
      <p
        role="status"
        aria-atomic="true"
        className="text-sm text-muted-foreground"
      >
        {pending && report
          ? "Re-auditing repository…"
          : copyStatus === "copied"
            ? "Report link copied."
            : copyStatus === "error"
              ? "Could not copy the report link. Select the link below to copy it manually."
              : ""}
      </p>
      {copyStatus === "error" && (
        <div className="space-y-2 text-sm">
          <label htmlFor="report-share-url" className="block font-medium">
            Copy the report link manually
          </label>
          <Input
            id="report-share-url"
            nativeInput
            readOnly
            value={reportUrl}
            onFocus={(event) => event.target.select()}
            className="min-h-11"
          />
        </div>
      )}
    </div>
  );

  if (!report)
    return (
      <>
        {pending ? (
          <ReportPending message={`Auditing ${owner}/${repo}…`} />
        ) : (
          <ReportErrorCard
            error={error || "Unable to load this report."}
            onRetry={() => void runAudit()}
            context={`${owner}/${repo}`}
            retryLabel="Try audit again"
            className="max-w-2xl"
          />
        )}
      </>
    );

  return (
    <ReportView
      report={report}
      baseUrl={origin}
      feedback={feedback}
      actions={
        <>
          <FixButton
            owner={owner}
            repo={repo}
            checks={report.checks}
            key={`${report.generatedAt}/${report.shareId}`}
            disabled={pending}
            onPendingChange={setRemediationPending}
          />
          <Button
            variant="outline"
            className="min-h-11"
            loading={pending}
            disabled={pending || remediationPending}
            onClick={() => void runAudit()}
          >
            <RefreshCw aria-hidden="true" />
            Re-audit
          </Button>
          <ReportShareMenu
            shareId={report.shareId}
            copyStatus={copyStatus}
            canCopy={Boolean(origin)}
            onCopy={() => void share()}
          />
        </>
      }
    />
  );
}
