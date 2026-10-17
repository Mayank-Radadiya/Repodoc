export const SUPPORTED_CI_LANGUAGES = Object.freeze([
  "node",
  "python",
  "go",
  "rust",
  "generic",
] as const);

export type CILanguage = (typeof SUPPORTED_CI_LANGUAGES)[number];

export const CI_WORKFLOW_TARGET_PATH = ".github/workflows/ci.yml";

export interface CIWorkflowOptions {
  /**
   * Name of the GitHub Actions workflow.
   * @default "CI"
   */
  workflowName?: string;

  /**
   * Primary Git branch to trigger on (e.g. "main", "master", "develop").
   * When omitted, triggers on both "main" and "master".
   */
  defaultBranch?: string;
}

export interface GenerateCIWorkflowOptions extends CIWorkflowOptions {
  /**
   * Explicitly override the language instead of detecting from repository files.
   */
  language?: CILanguage;
}

export interface GeneratedCIWorkflow {
  language: CILanguage;
  targetPath: string;
  workflow: string;
}
