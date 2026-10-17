import { CHECKOUT_STEP, renderWorkflowBase } from "./base";
import type { CIWorkflowOptions } from "./types";

/**
 * Renders a GitHub Actions workflow for Go projects using actions/setup-go@v5 and go test ./...
 */
export function renderGoWorkflow(options?: CIWorkflowOptions): string {
  const steps = [
    CHECKOUT_STEP,
    [
      "      - name: Set up Go",
      "        uses: actions/setup-go@v5",
      "        with:",
      '          go-version: "stable"',
    ].join("\n"),
    [
      "      - name: Run tests",
      "        run: go test ./...",
    ].join("\n"),
  ];

  return renderWorkflowBase(steps, options);
}
