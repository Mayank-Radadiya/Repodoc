import { CHECKOUT_STEP, renderWorkflowBase } from "./base";
import type { CIWorkflowOptions } from "./types";

/**
 * Renders a GitHub Actions workflow for Rust projects using actions-rs/toolchain@v1 and cargo test.
 */
export function renderRustWorkflow(options?: CIWorkflowOptions): string {
  const steps = [
    CHECKOUT_STEP,
    [
      "      - name: Set up Rust toolchain",
      "        uses: actions-rs/toolchain@v1",
      "        with:",
      "          toolchain: stable",
      "          profile: minimal",
      "          override: true",
    ].join("\n"),
    [
      "      - name: Run tests",
      "        run: cargo test",
    ].join("\n"),
  ];

  return renderWorkflowBase(steps, options);
}
