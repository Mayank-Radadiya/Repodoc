"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthControls } from "@/components/auth/auth-controls";
import { AuditRepositoryDialog } from "./audit-dialog";
import { ThemeToggle } from "./theme-toggle";
import { useReportTheme } from "./theme-scope";

export function ReportShell({ children }: { children: ReactNode }) {
  const [auditOpen, setAuditOpen] = useState(false);
  const auditReturnFocus = useRef<HTMLElement | null>(null);
  const { scopeElement } = useReportTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!auditOpen) {
          auditReturnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }
        setAuditOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [auditOpen]);

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#report-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:shadow-overlay"
      >
        Skip to report
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <nav
          aria-label="Report navigation"
          className="mx-auto flex min-h-16 w-full max-w-[80rem] items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8"
        >
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="Repodoc home"
              className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-md"
            >
              <Image src="/logo.svg" alt="" width={28} height={28} />
              <span className="font-display text-lg font-semibold tracking-tight">
                Repodoc
              </span>
            </Link>
            <span aria-hidden="true" className="hidden text-border sm:block">
              /
            </span>
            <span className="hidden text-sm text-muted-foreground sm:block">
              Reports
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              className="min-h-11"
              aria-label="Audit another repository"
              onClick={(event) => {
                auditReturnFocus.current = event.currentTarget;
                setAuditOpen(true);
              }}
            >
              <Search aria-hidden="true" />
              <span className="hidden md:inline">Audit another repository</span>
              <kbd
                aria-hidden="true"
                className="ml-1 hidden rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground lg:inline"
              >
                ⌘K
              </kbd>
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <ThemeToggle />
            <AuthControls portalContainer={scopeElement} />
          </div>
        </nav>
      </header>
      <main
        id="report-content"
        className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {children}
      </main>
      <AuditRepositoryDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        returnFocus={auditReturnFocus}
      />
    </div>
  );
}
