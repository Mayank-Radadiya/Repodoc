import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardToolbar } from "../dashboard-toolbar";

describe("DashboardToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders search input, status filters, language and sort selectors", () => {
    const onSearchChange = vi.fn();
    const onStatusFilterChange = vi.fn();
    const onLanguageChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <DashboardToolbar
        search="test-query"
        onSearchChange={onSearchChange}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        selectedLanguage="all"
        onLanguageChange={onLanguageChange}
        languages={["TypeScript", "Python"]}
        sortBy="updated"
        onSortChange={onSortChange}
        totalFiltered={5}
      />,
    );

    const input = screen.getByPlaceholderText(
      /search repositories/i,
    ) as HTMLInputElement;
    expect(input.value).toBe("test-query");

    fireEvent.change(input, { target: { value: "new-query" } });
    expect(onSearchChange).toHaveBeenCalledWith("new-query");

    const auditedTab = screen.getByRole("button", { name: /^audited$/i });
    fireEvent.click(auditedTab);
    expect(onStatusFilterChange).toHaveBeenCalledWith("audited");

    const unauditedTab = screen.getByRole("button", { name: /^needs audit$/i });
    fireEvent.click(unauditedTab);
    expect(onStatusFilterChange).toHaveBeenCalledWith("unaudited");

    expect(screen.getByText(/showing 5 repositories/i)).toBeDefined();
  });
});
