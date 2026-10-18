export { UrlInput, type UrlInputProps } from "./url-input";
export { FixButton, type FixButtonProps } from "./fix-button";
export {
  CategoryBreakdown,
  type CategoryBreakdownProps,
} from "./category-breakdown";
export { CheckRow, type CheckRowProps } from "./check-row";
export { EvidenceExcerpt, type EvidenceExcerptProps } from "./evidence-excerpt";
export {
  ScoreGauge,
  BADGE_COLOR_PALETTE,
  normalizeScore,
  getScoreGaugePalette,
  type ScoreGaugeProps,
  type ScoreGaugeSize,
  type BadgeColorDefinition,
} from "./score-gauge";
export {
  BadgeSnippet,
  DEFAULT_BASE_URL,
  DEFAULT_BADGE_LABEL,
  sanitizeBaseUrl,
  sanitizeRepoCoordinate,
  buildBadgeEndpointUrl,
  buildShieldsUrl,
  buildReportUrl,
  buildShareUrl,
  buildMarkdownSnippet,
  buildHtmlSnippet,
  getSnippetForFormat,
  copyToClipboard,
  type BadgeSnippetProps,
  type BadgeSnippetFormat,
  type GenerateBadgeUrlsOptions,
} from "./badge-snippet";
export {
  BadgeFormatSelector,
  FORMATS,
  type BadgeFormatSelectorProps,
  type BadgeFormatItem,
} from "./badge-format-selector";
export {
  BadgeCopyButton,
  type BadgeCopyButtonProps,
} from "./badge-copy-button";

export { ReportView, type ReportViewProps } from "./report-view";
export { ReportPending } from "./report-pending";
export { ShareController, type ShareControllerProps } from "./share-controller";
export {
  ReportErrorCard,
  classifyReportError,
  type ReportErrorCardProps,
  type ReportErrorKind,
  type ClassifiedReportError,
} from "./report-error-card";
export {
  REPORT_THEME_COOKIE,
  parseReportTheme,
  type ReportTheme,
} from "./theme";
export {
  ReportThemeScope,
  useReportTheme,
  type ReportThemeScopeProps,
} from "./theme-scope";
export { ThemeToggle, type ThemeToggleProps } from "./theme-toggle";
export {
  AuditRepositoryDialog,
  type AuditRepositoryDialogProps,
} from "./audit-dialog";
export {
  LicenseSelector,
  type LicenseChoice,
  type LicenseSelectorProps,
} from "./license-selector";
export {
  REPORT_CATEGORIES,
  REPORT_CATEGORY_IDS,
  getReportCategory,
  type ReportCategoryMeta,
} from "./categories";
export {
  applyCheckPreview,
  computeReportPreview,
  getPotentialPoints,
  type ReportPreview,
} from "./report-preview";
