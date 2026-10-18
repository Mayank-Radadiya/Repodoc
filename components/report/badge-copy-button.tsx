"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BadgeSnippetFormat } from "./badge-format-selector";

export interface BadgeCopyButtonProps {
  copied: boolean;
  copying: boolean;
  copyError: boolean;
  copyLabel: string;
  activeFormat: BadgeSnippetFormat;
  statusId?: string;
  onCopy: () => void;
  className?: string;
}

export function BadgeCopyButton({
  copied,
  copying,
  copyError,
  copyLabel,
  activeFormat,
  statusId,
  onCopy,
  className,
}: BadgeCopyButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onCopy}
      aria-disabled={copying}
      aria-busy={copying}
      aria-describedby={copyError ? statusId : undefined}
      aria-label={
        copied
          ? "Copied snippet to clipboard"
          : `Copy ${activeFormat} snippet`
      }
      className={className ?? "min-h-11 gap-2 focus-visible:ring-blue-600 motion-reduce:transition-none dark:focus-visible:ring-blue-400 sm:min-h-11"}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : copying ? "Copying…" : `Copy ${copyLabel}`}
    </Button>
  );
}
