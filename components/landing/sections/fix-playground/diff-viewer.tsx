import { FileCode2, Sparkles } from "lucide-react";
import type { SampleCheck, ProposedFile } from "../../types/report";

export interface FixItem extends SampleCheck {
  file: ProposedFile;
  label: string;
  detail: string;
}

export interface DiffViewerProps {
  selectedFixes: FixItem[];
  preview: FixItem | undefined;
  previewId: string;
  onSelectPreview: (id: string) => void;
}

export function DiffViewer({
  selectedFixes,
  preview,
  onSelectPreview,
}: DiffViewerProps) {
  return (
    <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
      {/* Diff Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3">
        <div className="flex items-center gap-2">
          {selectedFixes.map((fix) => (
            <button
              key={fix.id}
              type="button"
              onClick={() => onSelectPreview(fix.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                preview?.id === fix.id
                  ? "bg-slate-800 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode2 size={13} />
              {fix.file.path}
            </button>
          ))}
        </div>

        <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
          <Sparkles size={12} />
          Atomic Blob Generated
        </span>
      </div>

      {/* Diff Content */}
      <div className="p-4 sm:p-6 font-mono text-xs overflow-x-auto max-h-120">
        {preview ? (
          <div>
            <div className="text-slate-500 mb-3 border-b border-slate-800/80 pb-2">
              diff --git a/{preview.file.path} b/{preview.file.path}
              <br />
              new file mode 100644
            </div>
            <div className="flex flex-col gap-0.5">
              {preview.file.lines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-emerald-950/30 text-emerald-300 px-2 py-0.5 rounded-xs"
                >
                  <span className="text-emerald-600 select-none">+</span>
                  <span className="text-slate-500 select-none text-[10px] w-6">
                    {index + 1}
                  </span>
                  <span className="font-mono whitespace-pre">{line}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <p>
              No files selected. Toggle a missing essential on the left to preview
              the diff.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
