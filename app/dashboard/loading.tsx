import styles from "@/components/dashboard/dashboard.module.css";

export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className={`${styles.view} ${styles.loading}`}
    >
      <span className="sr-only">Loading your repositories…</span>
      <div aria-hidden="true" className={styles.pageHeading}>
        <div>
          <div
            className={styles.skeleton}
            style={{ height: 36, width: 260, maxWidth: "100%" }}
          />
          <div
            className={styles.skeleton}
            style={{ height: 16, width: 200, marginTop: 12 }}
          />
        </div>
        <div className={styles.skeleton} style={{ width: 180, height: 44 }} />
      </div>
      <div className={styles.summary} aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className={`${styles.metric} ${item === 1 ? styles.coverage : ""}`}
          >
            <div
              className={styles.skeleton}
              style={{ height: 14, width: 80 }}
            />
            <div
              className={styles.skeleton}
              style={{ height: 32, width: 60, marginTop: 16 }}
            />
            <div
              className={styles.skeleton}
              style={{ height: 12, width: "80%", marginTop: 12 }}
            />
          </div>
        ))}
      </div>
      <div className={`${styles.skeleton} ${styles.scopeNote}`} style={{ height: 20, width: "70%" }} aria-hidden="true" />
      <div className={styles.workspaceBody} aria-hidden="true">
      <div className={styles.collection}>
        <div className={styles.collectionHeading}><div className={styles.skeleton} style={{ height: 27, width: 180 }} /></div>
        <div className={styles.filterHeading}>
          <div
            className={styles.skeleton}
            style={{ height: 36, width: 240, marginBottom: 12 }}
          />
        </div>
        <div
          className={styles.skeleton}
          style={{ height: 44, width: "100%", marginBottom: 20 }}
        />
        <div className={styles.repoList}>
          <div className={styles.listHeading} />
          <ul className={styles.repoItems}>
            {[0, 1, 2, 3].map((item) => (
              <li key={item} className={styles.repoRow}>
                <div className={styles.repoDetails}>
                  <div
                    className={styles.skeleton}
                    style={{ height: 18, width: "55%" }}
                  />
                  <div
                    className={styles.skeleton}
                    style={{ height: 14, width: "85%", marginTop: 12 }}
                  />
                  <div
                    className={styles.skeleton}
                    style={{ height: 12, width: "45%", marginTop: 16 }}
                  />
                </div>
                <div
                  className={styles.skeleton}
                  style={{ height: 36, width: 80 }}
                />
                <div
                  className={styles.skeleton}
                  style={{ height: 14, width: 80 }}
                />
                <div
                  className={`${styles.skeleton} ${styles.repoActions}`}
                  style={{ height: 44, width: "100%" }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.insights}>
        <div className={styles.insightPanel}>
          <div className={styles.skeleton} style={{ height: 21, width: 160, marginBottom: 24 }} />
          <div className={styles.skeleton} style={{ height: 12, width: "100%", marginBottom: 18 }} />
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className={styles.skeleton} style={{ height: 18, width: "100%", marginTop: 10 }} />)}
          <div className={styles.languageSection}>
            <div className={styles.skeleton} style={{ height: 18, width: 140, marginTop: 24 }} />
            {[0, 1, 2].map((item) => <div key={item} className={styles.skeleton} style={{ height: 29, width: "100%", marginTop: 18 }} />)}
          </div>
        </div>
        <div className={styles.insightPanel}>
          <div className={styles.skeleton} style={{ height: 21, width: 120 }} />
          {[0, 1, 2].map((item) => <div key={item} className={styles.skeleton} style={{ height: 60, width: "100%", marginTop: 16 }} />)}
        </div>
      </div>
      </div>
    </div>
  );
}
