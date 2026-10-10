"use client";

import { useState } from "react";
import {
  GitPullRequest,
  GitCommit,
  GitBranch,
  FileCode,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { RepoAuditProfile, DiffFileItem } from "./types";

interface DiffViewProps {
  repo: RepoAuditProfile;
}

export function DiffView({ repo }: DiffViewProps) {
  const [activeFileId, setActiveFileId] = useState<string>(
    repo.diffFiles[0]?.id || "gitignore"
  );
  const [prCreated, setPrCreated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);

  const activeFile =
    repo.diffFiles.find((f) => f.id === activeFileId) || repo.diffFiles[0];

  const handleSimulatePR = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setPrCreated(true);
    }, 700);
  };

  const handleCopyContent = () => {
    if (!activeFile) return;
    const rawContent = activeFile.diffLines
      .filter((l) => l.type === "add" || l.type === "context")
      .map((l) => l.content.replace(/^\+/, ""))
      .join("\n");
    navigator.clipboard.writeText(rawContent);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  if (!repo.diffFiles || repo.diffFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-white/8 bg-[#0e1420]/60">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
          <Check className="size-6" />
        </div>
        <h4 className="font-display text-base font-semibold text-white">
          Repository Hygiene is 100% Complete
        </h4>
        <p className="mt-1 max-w-md text-xs text-slate-400 leading-relaxed">
          {repo.fullName} already has a valid OSI license, language-appropriate .gitignore,
          and automated CI workflows. No atomic PR remediation is required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Low-Level Git Data API Pipeline Telemetry ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0e1420]/80 p-3.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <GitBranch className="size-3.5 text-sky-400" />
            <span className="text-slate-400">Branch:</span>
            <span className="text-white bg-white/6 px-1.5 py-0.5 rounded">
              repodoc/health-remediation
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <GitCommit className="size-3.5 text-emerald-400" />
            <span className="text-slate-400">Commit:</span>
            <span className="text-white">8f4a1c0</span>
          </div>

          <span className="hidden sm:inline text-slate-500">•</span>

          <span className="text-xs text-slate-400">
            3 files bundled via Git Blobs &amp; Trees API (1 commit)
          </span>
        </div>

        <button
          type="button"
          onClick={handleSimulatePR}
          disabled={isSubmitting || prCreated}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
            prCreated
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-white text-slate-950 hover:bg-slate-200 active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="size-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              <span>Constructing Blobs...</span>
            </>
          ) : prCreated ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span>PR #42 Created</span>
            </>
          ) : (
            <>
              <GitPullRequest className="size-3.5" />
              <span>Open 1-Click PR</span>
            </>
          )}
        </button>
      </div>

      {/* ── Multi-File Tabs & Unified Diff Viewer ── */}
      <div className="rounded-xl border border-white/8 bg-[#0a0e16] overflow-hidden">
        {/* File Tabs */}
        <div className="flex items-center justify-between border-b border-white/8 bg-[#0e1420]/80 px-2 pt-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {repo.diffFiles.map((file) => {
              const isActive = activeFile?.id === file.id;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                    isActive
                      ? "bg-[#0a0e16] text-white border border-white/10 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/4"
                  }`}
                >
                  <FileCode className="size-3.5 text-sky-400" />
                  <span>{file.filename}</span>
                  <span className="rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-300">
                    +{file.diffLines.filter((l) => l.type === "add").length}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCopyContent}
            className="hidden sm:inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/4 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/8 hover:text-white"
          >
            {copiedFile ? (
              <>
                <Check className="size-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3 text-slate-400" />
                <span>Copy File</span>
              </>
            )}
          </button>
        </div>

        {/* Diff Meta Summary */}
        {activeFile && (
          <div className="border-b border-white/6 bg-white/2 px-4 py-2 text-xs text-slate-400">
            {activeFile.summary}
          </div>
        )}

        {/* Unified Git Diff Rows */}
        <div className="max-h-[380px] overflow-y-auto p-2 font-mono text-[11px] leading-relaxed">
          {activeFile?.diffLines.map((line, idx) => {
            const isAdd = line.type === "add";
            const isHeader = line.type === "header";

            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 rounded ${
                  isAdd
                    ? "bg-emerald-500/10 text-emerald-300"
                    : isHeader
                    ? "bg-sky-500/10 text-sky-300 select-none my-1"
                    : "text-slate-400"
                }`}
              >
                <span className="w-8 shrink-0 text-slate-600 select-none text-right pr-3">
                  {line.newLine || ""}
                </span>
                <span className="w-4 shrink-0 text-slate-500 select-none">
                  {isAdd ? "+" : isHeader ? "@" : " "}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">
                  {line.content.replace(/^\+/, "")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
