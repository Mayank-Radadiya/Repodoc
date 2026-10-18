"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { AuthControls } from "@/components/auth/auth-controls";
import { AuditRepositoryDialog } from "@/components/report/audit-dialog";
import styles from "./dashboard.module.css";

export interface DashboardNavbarProps {
  section?: string;
  navLabel?: string;
  portalContainer?: HTMLElement | null;
}

export function DashboardNavbar({
  section = "Dashboard",
  navLabel,
  portalContainer,
}: DashboardNavbarProps) {
  const [auditOpen, setAuditOpen] = useState(false);
  const auditReturnFocus = useRef<HTMLElement | null>(null);

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

  const openAudit = (event?: React.MouseEvent<HTMLElement>) => {
    if (!auditOpen) {
      auditReturnFocus.current =
        event?.currentTarget instanceof HTMLElement
          ? event.currentTarget
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    }
    setAuditOpen(true);
  };

  return (
    <>
      <header className={styles.header}>
        <nav
          aria-label={navLabel ?? `${section} navigation`}
          className={styles.navigation}
        >
          {/* Brand + Context Breadcrumb (static badge, not a link) */}
          <div className={styles.brandCluster}>
            <Link href="/" className={styles.brand} aria-label="Repodoc home">
              <span className={styles.logoMark}>
                <Image src="/logo.svg" alt="" width={26} height={26} priority />
              </span>
              <span className={styles.brandText}>Repodoc</span>
            </Link>
            <span className={styles.navDivider} aria-hidden="true">
              /
            </span>
            <span className={styles.breadcrumbBadge}>{section}</span>
          </div>

          {/* Center: Command Bar / Quick Audit Trigger */}
          <div className={styles.commandCenter}>
            <button
              type="button"
              onClick={openAudit}
              className={styles.commandTrigger}
              aria-label="Audit a GitHub repository"
            >
              <Search className={styles.commandIcon} aria-hidden="true" />
              <span className={styles.commandPlaceholder}>
                Audit repository or URL…
              </span>
              <kbd className={styles.commandKbd} aria-hidden="true">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: User Account Menu */}
          <div className={styles.navActions}>
            <div className={styles.accountWrapper}>
              <AuthControls portalContainer={portalContainer} />
            </div>
          </div>
        </nav>
      </header>

      <AuditRepositoryDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        returnFocus={auditReturnFocus}
      />
    </>
  );
}
