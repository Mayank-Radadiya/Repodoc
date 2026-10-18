/** Public, allowlisted recovery messages shared by the API and browser. */
export const REMEDIATION_FEEDBACK = {
  repository_scope_required:
    "GitHub has not granted access to create the pull request branch. Reconnect GitHub and authorize public repository access.",
  workflow_scope_required:
    "GitHub has not granted permission to add CI workflows. Reconnect GitHub to authorize workflow access, or deselect Automated CI workflow and create a pull request for the remaining fixes.",
} as const;

export type RemediationFeedbackCode = keyof typeof REMEDIATION_FEEDBACK;

export function isRemediationFeedbackCode(
  value: unknown,
): value is RemediationFeedbackCode {
  return typeof value === "string" && Object.hasOwn(REMEDIATION_FEEDBACK, value);
}
