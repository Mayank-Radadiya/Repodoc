import { CHECKOUT_STEP, renderWorkflowBase } from "./base";
import type { CIWorkflowOptions } from "./types";

/**
 * Renders a GitHub Actions workflow for Python projects using actions/setup-python@v5 and pytest.
 */
export function renderPythonWorkflow(options?: CIWorkflowOptions): string {
  const steps = [
    CHECKOUT_STEP,
    [
      "      - name: Set up Python",
      "        uses: actions/setup-python@v5",
      "        with:",
      '          python-version: "3.11"',
    ].join("\n"),
    [
      "      - name: Install dependencies",
      "        run: |",
      "          python -m pip install --upgrade pip",
      "          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi",
      "          pip install pytest",
    ].join("\n"),
    [
      "      - name: Run tests",
      "        run: pytest",
    ].join("\n"),
  ];

  return renderWorkflowBase(steps, options);
}
