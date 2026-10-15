"use client";

import { useState } from "react";
import {
  Folder,
  FileText,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Zap,
} from "lucide-react";
import { MOCK_TREE_NODES, type GitTreeMockNode } from "../../data/steps";

export function TreeTraversalVisual() {
  const [selectedNode, setSelectedNode] = useState<GitTreeMockNode>(
    MOCK_TREE_NODES[2], // default to missing .gitignore
  );
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = () => {
    if (isSimulating) return;
    setIsSimulating(true);

    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % MOCK_TREE_NODES.length;
      setSelectedNode(MOCK_TREE_NODES[idx]);
    }, 350);

    setTimeout(() => {
      clearInterval(interval);
      setSelectedNode(MOCK_TREE_NODES[2]); // return to highlighted missing file
      setIsSimulating(false);
    }, 2100);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar: Benchmarks & Single-Call Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-[#005FD6]">
            <Zap size={14} className="fill-[#005FD6]" />
            <span>Repodoc Git Tree API:</span>
          </div>
          <span className="font-mono text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
            1 call · 118ms
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 font-mono">
          <span>Standard REST Crawl:</span>
          <span className="text-slate-400 line-through">42 calls · 4,200ms</span>
        </div>
      </div>

      {/* Main Split: Interactive Tree Hierarchy & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[300px]">
        {/* Left Column: Recursive Git Tree Nodes (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Folder size={14} className="text-[#005FD6]" />
              <span>Git Tree /main (recursive=1)</span>
            </div>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-blue-50 text-[#005FD6] hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Zap size={11} className={isSimulating ? "animate-spin" : ""} />
              {isSimulating ? "Traversing..." : "Re-simulate Ingestion"}
            </button>
          </div>

          <div
            className="space-y-1 overflow-y-auto max-h-[220px] sm:max-h-[260px] pr-1"
            role="list"
            aria-label="Repository files discovered via recursive Git tree"
          >
            {MOCK_TREE_NODES.map((node) => {
              const isSelected = selectedNode.path === node.path;
              const isMissing = node.status === "missing";

              return (
                <button
                  key={node.path}
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/90 border border-[#005FD6]/30 text-[#005FD6] font-medium shadow-2xs"
                      : "hover:bg-slate-50 border border-transparent text-slate-700"
                  }`}
                  style={{ paddingLeft: `${Math.max(node.depth * 16 + 10, 10)}px` }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {node.type === "tree" ? (
                      <Folder size={13} className="text-amber-500 shrink-0" />
                    ) : isMissing ? (
                      <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                    ) : node.name.endsWith(".json") || node.name.endsWith(".yml") ? (
                      <FileCode2 size={13} className="text-blue-500 shrink-0" />
                    ) : (
                      <FileText size={13} className="text-slate-500 shrink-0" />
                    )}
                    <span className="truncate">{node.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isMissing
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "text-slate-400 bg-slate-100"
                      }`}
                    >
                      {isMissing ? "MISSING" : node.mode}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Payload: 41.2 KB</span>
            <span>1,482 objects mapped</span>
          </div>
        </div>

        {/* Right Column: Node Inspector & Raw Git Data (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Terminal size={13} className="text-slate-500" />
              Object Telemetry
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
                  viewMode === "visual"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Inspect
              </button>
              <button
                type="button"
                onClick={() => setViewMode("json")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer font-medium ${
                  viewMode === "json"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {viewMode === "visual" ? (
            <div className="space-y-3 text-xs flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-slate-400 text-[11px]">Selected Target</span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      selectedNode.status === "missing"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {selectedNode.status === "missing" ? "Remediation Candidate" : "Verified Blob"}
                  </span>
                </div>
                <h4 className="font-mono font-bold text-slate-900 text-sm mt-1 truncate">
                  {selectedNode.path}
                </h4>
              </div>

              <div className="space-y-2 font-mono text-[11px] bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/70">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode:</span>
                  <span className="text-slate-800">{selectedNode.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Git SHA:</span>
                  <span className="text-slate-800">{selectedNode.sha}</span>
                </div>
                {selectedNode.size && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Size:</span>
                    <span className="text-slate-800">{selectedNode.size.toLocaleString()} bytes</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Traversal:</span>
                  <span className="text-emerald-600 font-semibold">&lt; 0.1ms (in-memory)</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  selectedNode.status === "missing"
                    ? "border-rose-200 bg-rose-50/60 text-rose-800"
                    : "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  {selectedNode.status === "missing" ? (
                    <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  )}
                  <span>{selectedNode.statusText}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Passes to Step 02:</span>
                <span className="font-mono font-semibold text-[#005FD6] flex items-center gap-1">
                  AST Engine <ArrowRight size={11} />
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto flex-1">
              <pre>
                {JSON.stringify(
                  {
                    path: selectedNode.path,
                    mode: selectedNode.mode,
                    type: selectedNode.type,
                    sha: selectedNode.sha,
                    size: selectedNode.size ?? null,
                    status: selectedNode.status,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TreeTraversalVisual;
