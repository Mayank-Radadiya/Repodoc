"use client";

import { useState } from "react";
import {
  Award,
  Copy,
  Check,
  Terminal,
} from "lucide-react";

export function BadgeStudio() {
  const [repoPath, setRepoPath] = useState("astral-sh/uv");
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const cleanPath = repoPath.replace(/^https?:\/\/github\.com\//, "").trim() || "owner/repo";
  const [owner, repo] = cleanPath.includes("/") ? cleanPath.split("/") : ["owner", "repo"];

  const badgeUrl = `https://img.shields.io/endpoint?url=https://repodoc.dev/api/badge/${owner}/${repo}`;
  const reportUrl = `https://repodoc.dev/report/${owner}/${repo}`;

  const markdownSnippet = `[![Repo Health](${badgeUrl})](${reportUrl})`;
  const htmlSnippet = `<a href="${reportUrl}"><img src="${badgeUrl}" alt="Repo Health" /></a>`;
  const jsonPreview = `{
  "schemaVersion": 1,
  "label": "repo health",
  "message": "94/100",
  "color": "brightgreen"
}`;

  const handleCopy = (format: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <section id="badge-studio" className="relative scroll-mt-24 py-16 lg:py-24 border-t border-white/8 bg-[#06080d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-mono text-xs font-medium text-sky-400">
            <Award className="size-3.5" />
            <span>Shields.io Integration</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Embed Real-Time Health Badges in Your README
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base leading-relaxed">
            Repodoc serves standard Shields.io endpoint JSON at <code className="text-slate-200">/api/badge/:owner/:repo</code>, eliminating fragile server-rendered SVG canvas pipelines.
          </p>
        </div>

        {/* ── Interactive Badge Studio Card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Left: Input & Live Render */}
            <div className="space-y-6">
              <div>
                <label className="block font-mono text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Target GitHub Repository
                </label>
                <div className="flex items-center rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
                  <Terminal className="size-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="owner/repo"
                    className="w-full bg-transparent font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none sm:text-sm"
                  />
                </div>
              </div>

              {/* Rendered Live Badge Mock */}
              <div className="rounded-xl border border-white/8 bg-black/30 p-5 space-y-3">
                <span className="font-mono text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Live Badge Preview
                </span>

                <div className="flex items-center gap-3">
                  <div className="inline-flex overflow-hidden rounded font-mono text-xs shadow-md">
                    <span className="bg-[#24292e] px-3 py-1.5 text-white font-medium">
                      repo health
                    </span>
                    <span className="bg-emerald-400 px-3 py-1.5 font-bold text-slate-950">
                      94/100
                    </span>
                  </div>

                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    brightgreen (&gt;= 90)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-mono text-slate-400">
                  <span>Thresholds:</span>
                  <span className="text-emerald-400">≥90 brightgreen</span>
                  <span>•</span>
                  <span className="text-green-400">≥75 green</span>
                  <span>•</span>
                  <span className="text-yellow-400">≥60 yellow</span>
                  <span>•</span>
                  <span className="text-rose-400">&lt;40 red</span>
                </div>
              </div>

              {/* JSON Endpoint Output */}
              <div className="rounded-xl border border-white/8 bg-black/40 p-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                  <span>GET /api/badge/{owner}/{repo}</span>
                  <span className="text-sky-400">schemaVersion: 1</span>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto">
                  <code>{jsonPreview}</code>
                </pre>
              </div>
            </div>

            {/* Right: Copyable Snippets */}
            <div className="space-y-4">
              {/* Markdown Card */}
              <div className="rounded-xl border border-white/8 bg-black/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    Markdown (for README.md)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("markdown", markdownSnippet)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {copiedFormat === "markdown" ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-slate-400" />
                        <span>Copy Markdown</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded bg-black/50 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto border border-white/4">
                  <code>{markdownSnippet}</code>
                </pre>
              </div>

              {/* HTML Snippet Card */}
              <div className="rounded-xl border border-white/8 bg-black/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    HTML (for websites &amp; docs)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("html", htmlSnippet)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {copiedFormat === "html" ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-slate-400" />
                        <span>Copy HTML</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded bg-black/50 p-3 font-mono text-[11px] text-slate-300 overflow-x-auto border border-white/4">
                  <code>{htmlSnippet}</code>
                </pre>
              </div>

              {/* CDN Caching Note */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-sky-400 font-mono block">
                  Cache-Control: public, s-maxage=3600
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Shields.io caches the JSON response on its global CDN edge. Repository audits are never called unnecessarily on every README view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
