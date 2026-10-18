import "server-only";
import type { RemediationFeedbackCode } from "../remediation-feedback";

export type RemediationErrorCode =
  | RemediationFeedbackCode
  | "invalid_input"
  | "path_conflict"
  | "no_changes"
  | "fork_not_ready"
  | "fork_conflict";

export class RemediationError extends Error {
  constructor(
    readonly code: RemediationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RemediationError";
  }
}
