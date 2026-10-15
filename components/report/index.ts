export { UrlInput, type UrlInputProps } from "./url-input";
export { CategoryBreakdown, type CategoryBreakdownProps } from "./category-breakdown";
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

export { ReportView, type ReportViewProps } from "./report-view";
export { ReportPending } from "./report-pending";
export {
  ShareController,
  type ShareControllerProps,
} from "./share-controller";
export {
  ReportErrorCard,
  classifyReportError,
  type ReportErrorCardProps,
  type ReportErrorKind,
  type ClassifiedReportError,
} from "./report-error-card";


