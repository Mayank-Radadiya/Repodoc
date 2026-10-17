import { CHECKOUT_STEP, renderWorkflowBase } from "./base";
import type { CIWorkflowOptions } from "./types";

/**
 * Renders a GitHub Actions workflow for Node.js projects using actions/setup-node@v4 and npm test.
 */
export function renderNodeWorkflow(options?: CIWorkflowOptions): string {
  const steps = [
    CHECKOUT_STEP,
    [
      "      - name: Set up Node.js",
      "        uses: actions/setup-node@v4",
      "        with:",
      '          node-version: "20"',
      '          cache: "npm"',
    ].join("\n"),
    [
      "      - name: Install dependencies",
      "        run: npm ci || npm install",
    ].join("\n"),
    [
      "      - name: Run tests",
      "        run: npm test",
    ].join("\n"),
  ];

  return renderWorkflowBase(steps, options);
}
