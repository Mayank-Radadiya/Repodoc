import type { ReactNode } from "react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import styles from "@/components/dashboard/dashboard.module.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.workspace}>
      <a href="#dashboard-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <DashboardNavbar />
      <main id="dashboard-content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}

