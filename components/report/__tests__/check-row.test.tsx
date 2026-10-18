import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { CheckRow } from "../check-row";
import { makeCheck } from "./report-fixtures";

describe("CheckRow component", () => {
  const onTogglePreview = vi.fn();

  it("renders check name, passed badge, and awarded points", () => {
    const check = makeCheck("readme", "README file", "documentation", 10, 10, true, {
      evidence: {
        filesChecked: ["README.md"],
        found: true,
        details: "README exists and has content",
      },
    });

    render(
      <ul>
        <CheckRow
          check={check}
          owner="owner"
          repo="repo"
          defaultBranch="main"
          isPreviewed={false}
          onTogglePreview={onTogglePreview}
        />
      </ul>,
    );

    expect(screen.getByText("README file")).toBeDefined();
    expect(screen.getByText("Passed")).toBeDefined();
    expect(screen.getByText("10/10 pts")).toBeDefined();
    expect(screen.getByText("README exists and has content")).toBeDefined();
  });

  it("renders failed badge and preview button when check is not passed with potential points", () => {
    const check = makeCheck("license", "Open Source License", "documentation", 0, 10, false, {
      details: "No license file found",
    });

    render(
      <ul>
        <CheckRow
          check={check}
          owner="owner"
          repo="repo"
          defaultBranch="main"
          isPreviewed={false}
          onTogglePreview={onTogglePreview}
        />
      </ul>,
    );

    expect(screen.getByText("Failed")).toBeDefined();
    const previewBtn = screen.getByRole("button", { name: /Preview fix for Open Source License: \+10 pts/i });
    expect(previewBtn).toBeDefined();

    fireEvent.click(previewBtn);
    expect(onTogglePreview).toHaveBeenCalledWith("license");
  });

  it("renders previewed state when isPreviewed is true", () => {
    const check = makeCheck("license", "Open Source License", "documentation", 0, 10, false, {
      details: "No license file found",
    });

    render(
      <ul>
        <CheckRow
          check={check}
          owner="owner"
          repo="repo"
          defaultBranch="main"
          isPreviewed={true}
          onTogglePreview={onTogglePreview}
        />
      </ul>,
    );

    expect(screen.getByText("Previewed")).toBeDefined();
    const undoBtn = screen.getByRole("button", { name: /Remove preview for Open Source License/i });
    expect(undoBtn).toBeDefined();
  });
});
