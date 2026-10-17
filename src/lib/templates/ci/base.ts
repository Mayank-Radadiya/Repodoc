import type { CIWorkflowOptions } from "./types";

/**
 * Standard checkout step used by all workflow templates.
 */
export const CHECKOUT_STEP = [
  "      - name: Check out repository",
  "        uses: actions/checkout@v4",
].join("\n");

/**
 * Safely encodes a string for use as a YAML scalar value.
 * Wraps in double quotes using JSON escaping if the string contains YAML metacharacters.
 */
function formatYamlScalar(value: string): string {
  if (
    /[:#"'{}[\]&*?|<>=!%@`\\]/.test(value) ||
    value.startsWith("-") ||
    value.startsWith("?")
  ) {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Renders the common GitHub Actions workflow envelope (name, on triggers, jobs, runs-on, steps).
 */
export function renderWorkflowBase(
  steps: readonly string[],
  options?: CIWorkflowOptions,
): string {
  if (options?.workflowName !== undefined) {
    if (
      typeof options.workflowName !== "string" ||
      /[\r\n\u2028\u2029]/.test(options.workflowName)
    ) {
      throw new TypeError("workflowName must be a single-line string.");
    }
  }

  if (options?.defaultBranch !== undefined) {
    if (
      typeof options.defaultBranch !== "string" ||
      /[\r\n\u2028\u2029]/.test(options.defaultBranch)
    ) {
      throw new TypeError("defaultBranch must be a single-line string.");
    }
  }

  const rawName = options?.workflowName?.trim();
  const name = rawName && rawName.length > 0 ? formatYamlScalar(rawName) : "CI";

  const rawBranch = options?.defaultBranch?.trim();
  const branchList =
    rawBranch && rawBranch.length > 0
      ? `[ ${JSON.stringify(rawBranch)} ]`
      : `[ "main", "master" ]`;

  return [
    `name: ${name}`,
    "",
    "on:",
    "  push:",
    `    branches: ${branchList}`,
    "  pull_request:",
    `    branches: ${branchList}`,
    "",
    "jobs:",
    "  test:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    steps.join("\n"),
    "",
  ].join("\n");
}
