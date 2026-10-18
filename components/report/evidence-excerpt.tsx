"use client";

import { ExternalLink, FilePlus2 } from "lucide-react";
import type { CheckRemediation } from "@/lib/types";

export interface EvidenceExcerptProps {
  details: string;
  found: boolean;
  filesChecked: string[];
  remediation?: CheckRemediation;
  owner: string;
  repo: string;
  defaultBranch: string;
}

export function EvidenceExcerpt({
  details,
  found,
  filesChecked,
  remediation,
  owner,
  repo,
  defaultBranch,
}: EvidenceExcerptProps) {
  return (
    <div className="mt-2 space-y-4 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed">
      <p className="max-w-prose whitespace-pre-wrap break-words text-muted-foreground">
        {details.trim() ? details : "No evidence details available"}
      </p>
      <p className="text-muted-foreground">
        Evidence: {found ? "Found" : "Not found"}
      </p>
      <div>
        <p className="font-medium text-foreground">Files checked</p>
        {filesChecked.length > 0 ? (
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {filesChecked.map((path, index) => (
              <li key={`${index}-${path}`}>
                <code className="whitespace-pre-wrap break-all">{path}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-muted-foreground">No files checked</p>
        )}
      </div>
      {remediation && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="font-medium text-foreground">How to fix</p>
          <p className="mt-1 text-muted-foreground">{remediation.description}</p>
          <p className="mt-1">
            <code className="rounded-sm bg-muted px-1.5 py-0.5 break-all">
              {remediation.targetPath}
            </code>
          </p>
          {remediation.canAutomate && (
            <a
              href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/new/${encodeURIComponent(defaultBranch)}?filename=${encodeURIComponent(remediation.targetPath)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-info-foreground underline-offset-4 hover:underline"
            >
              <FilePlus2 aria-hidden="true" className="size-3.5" />
              Create {remediation.targetPath} on GitHub
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
