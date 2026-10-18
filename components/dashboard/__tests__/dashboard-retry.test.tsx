import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardRetry } from "../dashboard-retry";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("DashboardRetry", () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it("refreshes server data when retry is activated", () => {
    render(<DashboardRetry />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
