"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  Plus,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
import { BrandMark, GithubIcon } from "./brand";
import { PreviewPanel } from "./reveal";
import { FileDiff, HealthBadge } from "./product-visuals";
import {
  categories,
  checks,
  missingChecks,
  passedChecks,
  sampleScore,
  projectedScore,
  proposedFiles,
  badgeMarkdown,
  type SampleCheck,
} from "./sample-report";
import styles from "./landing.module.css";

type DemoView = "overview" | "findings" | "pr" | "badge";
const views: {
  value: DemoView;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "findings", label: "Findings", icon: ListChecks },
  { value: "pr", label: "PR preview", icon: GitPullRequest },
  { value: "badge", label: "Badge", icon: Tag },
];

function isDemoView(value: unknown): value is DemoView {
  return views.some((view) => view.value === value);
}

function Score() {
  return (
    <div className={styles.scoreBlock}>
      <div className={styles.scoreRing}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r="51"
            fill="none"
            stroke="#e9edf2"
            strokeWidth="6"
          />
          <circle
            cx="60"
            cy="60"
            r="51"
            fill="none"
            stroke="var(--blue)"
            strokeWidth="6"
            strokeDasharray={`${(sampleScore / 100) * 320.44} 320.44`}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div>
          <strong>{sampleScore}</strong>
          <span>/ 100</span>
        </div>
      </div>
      <div>
        <span className={styles.microLabel}>REPOSITORY HEALTH</span>
        <h3>A solid foundation.</h3>
        <p>
          Two missing essentials.
          <br />A clear path forward.
        </p>
      </div>
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (view: DemoView) => void }) {
  return (
    <div className={styles.overview}>
      <div className={styles.healthColumn}>
        <Score />
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <div className={styles.category} key={category.id}>
              <div>
                <span>{category.shortName}</span>
                <span className={styles.categoryValue}>
                  {category.points}
                  <span> / {category.maxPoints}</span>
                </span>
              </div>
              <div className={styles.categoryTrack}>
                <span
                  className={
                    category.points < category.maxPoints
                      ? styles.partialTrack
                      : undefined
                  }
                  style={{
                    width: `${(category.points / category.maxPoints) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.findingsColumn}>
        <div className={styles.panelHeading}>
          <h3>What needs attention</h3>
          <span className={styles.countBadge}>{missingChecks.length}</span>
        </div>
        <p className={styles.panelDescription}>Small gaps. Practical fixes.</p>
        <div className={styles.summaryFindings}>
          {missingChecks.map((check) => (
            <button
              key={check.id}
              className={styles.summaryFinding}
              onClick={() => onNavigate("findings")}
            >
              <CircleAlert size={16} />
              <span>
                <strong>
                  {check.id === "gitignore"
                    ? "Missing .gitignore"
                    : "No CI workflow"}
                </strong>
                <code>{check.path}</code>
              </span>
              <span className={styles.lostPoints}>−{check.maxPoints}</span>
            </button>
          ))}
        </div>
        <div className={styles.passedSummary}>
          <span>
            <Check size={14} /> {passedChecks.length} checks passed
          </span>
          <button onClick={() => onNavigate("findings")}>
            All findings <ArrowUpRight size={13} />
          </button>
        </div>
        <div className={styles.evidenceNote}>
          <ShieldCheck size={15} />
          <span>
            Every finding includes the file checked,
            <br className={styles.desktopOnly} /> the evidence, and a
            recommended fix.
          </span>
        </div>
      </div>
      <aside className={styles.remediationColumn}>
        <span className={styles.prLabel}>
          <GitPullRequest size={15} /> READY FOR REVIEW
        </span>
        <h3>
          A better baseline. <br />
          One pull request.
        </h3>
        <p>Proposed additions for the two missing essentials.</p>
        <div className={styles.proposedList}>
          {proposedFiles.map((file) => (
            <div key={file.path}>
              <Plus size={13} />
              <code>{file.path}</code>
            </div>
          ))}
        </div>
        <div className={styles.projected}>
          <span>Projected score</span>
          <strong>
            {sampleScore}
            <ArrowRight size={14} />
            {projectedScore}
            <small>/100</small>
          </strong>
        </div>
        <button
          className={styles.primaryButton}
          onClick={() => onNavigate("pr")}
        >
          Preview fixes <ArrowRight size={15} />
        </button>
        <span className={styles.previewOnly}>
          Sample PR · no repository changes
        </span>
      </aside>
    </div>
  );
}

function FindingItem({ check }: { check: SampleCheck }) {
  return (
    <AccordionItem value={check.id} className={styles.findingItem}>
      <AccordionTrigger className={styles.findingTrigger}>
        <span
          className={check.passed ? styles.checkPassed : styles.checkMissing}
        >
          {check.passed ? <Check size={14} /> : <CircleAlert size={14} />}
        </span>
        <span className={styles.findingTitle}>
          <strong>{check.name}</strong>
          <code>{check.path}</code>
        </span>
        <span
          className={check.passed ? styles.earnedPoints : styles.lostPoints}
        >
          {check.passed
            ? `${check.maxPoints}/${check.maxPoints}`
            : `−${check.maxPoints} pts`}
        </span>
      </AccordionTrigger>
      <AccordionPanel className={styles.findingDetails}>
        <div>
          <span className={styles.microLabel}>EVIDENCE</span>
          <p>{check.evidence}</p>
        </div>
        <div>
          <span className={styles.microLabel}>
            {check.passed ? "STATUS" : "RECOMMENDED FIX"}
          </span>
          <p>{check.recommendation}</p>
        </div>
      </AccordionPanel>
    </AccordionItem>
  );
}

function Findings() {
  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.microLabel}>THE EVIDENCE</span>
          <h3>A reason behind every point.</h3>
          <p>
            {checks.length} checks across five categories. Open any check to see
            the details.
          </p>
        </div>
        <span className={styles.warningPill}>
          {missingChecks.length} findings
        </span>
      </div>
      <Accordion
        multiple
        defaultValue={["gitignore"]}
        className={styles.findingsList}
      >
        {[...missingChecks, ...passedChecks].map((check) => (
          <FindingItem check={check} key={check.id} />
        ))}
      </Accordion>
    </div>
  );
}

function PullRequest() {
  const additions = proposedFiles.reduce(
    (sum, file) => sum + file.lines.length,
    0,
  );
  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeading}>
        <div>
          <span className={styles.prLabel}>
            <GitPullRequest size={15} /> PROPOSED PULL REQUEST
          </span>
          <h3>Add missing repository essentials</h3>
          <p>
            A Node.js .gitignore and CI workflow, bundled into one reviewable
            commit.
          </p>
        </div>
        <span className={styles.warningPill}>Preview only</span>
      </div>
      <div className={styles.prMeta}>
        <span>
          <GitBranch size={14} />
          <code>repodoc/health-remediation</code>
          <ArrowRight size={13} />
          <code>main</code>
        </span>
        <span>
          <GitCommitHorizontal size={15} /> 1 commit{" "}
          <span className={styles.metaDivider}>/</span> {proposedFiles.length}{" "}
          files <span className={styles.added}>+{additions}</span>
        </span>
      </div>
      <div className={styles.prDiffs}>
        {proposedFiles.map((file) => (
          <FileDiff file={file} key={file.path} />
        ))}
      </div>
      <div className={styles.prOutcome}>
        <span>
          <Check size={15} /> Existing files preserved{" "}
          <span className={styles.metaDivider}>·</span> Maintainer reviews and
          merges
        </span>
        <span>
          Projected health{" "}
          <strong>
            {sampleScore} → {projectedScore}/100
          </strong>
        </span>
      </div>
    </div>
  );
}

function BadgePreview() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const snippetRef = useRef<HTMLTextAreaElement>(null);
  async function copyBadge() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(badgeMarkdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      snippetRef.current?.focus();
      snippetRef.current?.select();
    }
  }
  return (
    <div className={styles.badgePanel}>
      <div>
        <span className={styles.microLabel}>A SIGNAL IN YOUR README</span>
        <h3>Make repository health visible.</h3>
        <p>
          A familiar badge. A useful starting point for your next contributor.
        </p>
        <HealthBadge />
        <span className={styles.badgeSampleNote}>
          Local preview · sample score
        </span>
      </div>
      <div className={styles.badgeSnippet}>
        <div className={styles.panelHeading}>
          <label htmlFor="badge-markdown">Example Markdown</label>
          <button className={styles.copyButton} onClick={copyBadge}>
            {copyState === "copied" ? (
              <Check size={14} />
            ) : (
              <Clipboard size={14} />
            )}
            {copyState === "copied" ? "Copied" : "Copy snippet"}
          </button>
        </div>
        <textarea
          id="badge-markdown"
          ref={snippetRef}
          value={badgeMarkdown}
          readOnly
          spellCheck={false}
          aria-describedby="badge-template-note"
        />
        <p id="badge-template-note">
          Replace <code>your-repodoc-instance.example</code> and{" "}
          <code>owner/repo</code> with your deployment and repository when live
          audits are available.
        </p>
        <span className={styles.copyStatus} role="status">
          {copyState === "copied"
            ? "Example Markdown copied to clipboard."
            : copyState === "failed"
              ? "Clipboard unavailable. The snippet is selected so you can copy it manually."
              : ""}
        </span>
      </div>
    </div>
  );
}

export function ProductPreview() {
  const [activeView, setActiveView] = useState<DemoView>("overview");
  const tabRefs = useRef<Partial<Record<DemoView, HTMLButtonElement | null>>>(
    {},
  );

  useEffect(() => {
    // Native anchors still work without JavaScript; enhance section-specific links.
    function handlePreviewLink(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>(
        "a[data-preview-view]",
      );
      if (link && isDemoView(link.dataset.previewView))
        setActiveView(link.dataset.previewView);
    }
    document.addEventListener("click", handlePreviewLink);
    return () => document.removeEventListener("click", handlePreviewLink);
  }, []);
  function navigateToView(view: DemoView) {
    setActiveView(view);
    // The initiating button unmounts. Keep keyboard focus on the active tab.
    tabRefs.current[view]?.focus({ preventScroll: true });
  }
  return (
    <section
      className={styles.console}
      id="product-preview"
      aria-label="Interactive sample repository audit"
      tabIndex={-1}
    >
      <div className={styles.consoleChrome}>
        <span>
          <span className={styles.windowDots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <BrandMark />
          <strong>Repodoc</strong>
          <span className={styles.chromeDivider} />
          <span>Repository audit</span>
        </span>
        <span className={styles.sampleLabel}>
          <span /> SAMPLE DATA
        </span>
      </div>
      <div className={styles.repositoryBar}>
        <div>
          <GithubIcon size={20} />
          <h2>
            <span>sample</span>
            <ChevronRight size={14} />
            atlas-cli
          </h2>
          <span className={styles.publicPill}>Public</span>
        </div>
        <span className={styles.repoContext}>
          <GitBranch size={13} /> main{" "}
          <span className={styles.metaDivider}>/</span>
          <span className={styles.languageDot} /> Node.js
        </span>
      </div>
      <Tabs
        value={activeView}
        onValueChange={(value) => {
          if (isDemoView(value)) setActiveView(value);
        }}
        className={styles.consoleTabs}
      >
        <div className={styles.tabBar}>
          <TabsList
            variant="underline"
            className={styles.tabList}
            aria-label="Sample audit views"
          >
            {views.map((view) => (
              <TabsTab
                key={view.value}
                value={view.value}
                ref={(node) => {
                  tabRefs.current[view.value] = node;
                }}
                className={styles.tab}
              >
                <view.icon size={14} />
                <span>{view.label}</span>
                {view.value === "findings" && (
                  <span className={styles.tabCount}>
                    {missingChecks.length}
                  </span>
                )}
              </TabsTab>
            ))}
          </TabsList>
          <span className={styles.rubricVersion}>RUBRIC v1.0</span>
        </div>
        <TabsPanel value="overview">
          <PreviewPanel>
            <Overview onNavigate={navigateToView} />
          </PreviewPanel>
        </TabsPanel>
        <TabsPanel value="findings">
          <PreviewPanel>
            <Findings />
          </PreviewPanel>
        </TabsPanel>
        <TabsPanel value="pr">
          <PreviewPanel>
            <PullRequest />
          </PreviewPanel>
        </TabsPanel>
        <TabsPanel value="badge">
          <PreviewPanel>
            <BadgePreview />
          </PreviewPanel>
        </TabsPanel>
      </Tabs>
      <div className={styles.consoleFooter}>
        <span>
          <span className={styles.liveDot} /> Fictional repository · interactive
          preview
        </span>
        <span>
          <ShieldCheck size={12} /> Evidence-backed rubric
        </span>
      </div>
    </section>
  );
}
