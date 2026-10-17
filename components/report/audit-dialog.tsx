"use client";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReportTheme } from "./theme-scope";
import { UrlInput } from "./url-input";

export interface AuditRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: string;
}

/**
 * Command-palette style dialog for auditing a different repository.
 * The audit runs immediately when submitted and redirects to the new
 * report on success.
 */
export function AuditRepositoryDialog({
  open,
  onOpenChange,
  initialValue,
}: AuditRepositoryDialogProps) {
  const { scopeElement } = useReportTheme();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="max-w-xl"
        portalProps={{ container: scopeElement ?? undefined }}
      >
        <DialogHeader>
          <DialogTitle>Audit a GitHub repository</DialogTitle>
          <DialogDescription>
            Switch repositories or paste a GitHub URL. The audit starts right
            away.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <UrlInput
            label="GitHub repository"
            initialValue={initialValue}
            autoFocus
            redirectToReport
            onAuditSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogPopup>
    </Dialog>
  );
}
