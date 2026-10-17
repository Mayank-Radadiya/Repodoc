import { CHECKOUT_STEP, renderWorkflowBase } from "./base";
import type { CIWorkflowOptions } from "./types";

/**
 * Renders a fallback GitHub Actions workflow with basic checkout only.
 */
export function renderGenericWorkflow(options?: CIWorkflowOptions): string {
  const steps = [CHECKOUT_STEP];
  return renderWorkflowBase(steps, options);
}
