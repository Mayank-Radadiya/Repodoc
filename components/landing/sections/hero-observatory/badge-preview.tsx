"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export interface BadgePreviewProps {
  fixed: boolean;
  score: number;
  badgeColor: string;
}

export function BadgePreview({ fixed, score, badgeColor }: BadgePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyBadge = () => {
    navigator.clipboard.writeText(
      "[![Repo Health](https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/sample/atlas-cli)](https://repodoc.dev/report/sample/atlas-cli)",
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-300">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400">
          <span>GET /api/badge/sample/atlas-cli</span>
          <span className="text-emerald-400">200 OK (304 Cacheable)</span>
        </div>
        <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`{
  "schemaVersion": 1,
  "label": "repo health",
  "message": "${score}/100",
  "color": "${fixed ? "brightgreen" : "green"}"
}`}
        </pre>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Live Shields.io Badge
          </p>
          <div className="mt-2 inline-flex items-center rounded overflow-hidden shadow-xs border border-slate-300 text-[11px] font-sans">
            <span className="bg-slate-700 text-white px-2 py-0.5 font-medium">
              repo health
            </span>
            <span
              className="px-2 py-0.5 font-bold text-white transition-colors"
              style={{ backgroundColor: badgeColor }}
            >
              {score}/100
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyBadge}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {copied ? (
            <Check size={13} className="text-emerald-600" />
          ) : (
            <Copy size={13} />
          )}
          {copied ? "Copied snippet" : "Copy Markdown"}
        </button>
      </div>
    </div>
  );
}
