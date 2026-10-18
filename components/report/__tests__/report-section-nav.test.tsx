import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportSectionNav } from "../report-section-nav";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
  document.documentElement.style.removeProperty("scroll-padding-top");
});

function setup() {
  const bounds: Record<string, [number, number]> = {
    "report-overview": [160, 460],
    "report-findings": [560, 1800],
    "report-improvements": [560, 900],
    "report-badge": [924, 1400],
  };
  render(
    <>
      <ReportSectionNav />
      {Object.keys(bounds).map((id) => (
        <section id={id} key={id} />
      ))}
    </>,
  );
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const [top, bottom] = bounds[this.id] ?? [0, 0];
      return new DOMRect(0, top, 600, bottom - top);
    },
  );
  return bounds;
}

describe("ReportSectionNav", () => {
  it("keeps native section anchors and marks only overview initially", () => {
    setup();
    expect(
      screen
        .getByRole("link", { name: "Overview" })
        .getAttribute("aria-current"),
    ).toBe("location");
    expect(
      screen.getByRole("link", { name: "Findings" }).getAttribute("href"),
    ).toBe("#report-findings");
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(
      1,
    );
  });

  it("tracks scrolling and prefers findings when the rail is alongside it", async () => {
    const bounds = setup();
    bounds["report-overview"] = [-400, -100];
    bounds["report-findings"] = [80, 1500];
    bounds["report-improvements"] = [80, 420];
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "Findings" })
          .getAttribute("aria-current"),
      ).toBe("location"),
    );
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(
      1,
    );
  });

  it("honors an explicit tools anchor and returns to findings after scrolling past it", async () => {
    const bounds = setup();
    bounds["report-overview"] = [-400, -100];
    bounds["report-findings"] = [80, 1500];
    bounds["report-improvements"] = [80, 420];
    window.history.replaceState(null, "", "#report-improvements");
    fireEvent(window, new Event("hashchange"));
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "Improvements" })
          .getAttribute("aria-current"),
      ).toBe("location"),
    );
    bounds["report-improvements"] = [-400, -60];
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "Findings" })
          .getAttribute("aria-current"),
      ).toBe("location"),
    );
  });

  it("marks the badge after it becomes the reading section on mobile", async () => {
    const bounds = setup();
    bounds["report-overview"] = [-1600, -1300];
    bounds["report-findings"] = [-1200, -600];
    bounds["report-improvements"] = [-500, -100];
    bounds["report-badge"] = [80, 600];
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "Badge" })
          .getAttribute("aria-current"),
      ).toBe("location"),
    );
  });

  it("uses native anchor clearance when text zoom changes the scroll padding", async () => {
    const bounds = setup();
    document.documentElement.style.scrollPaddingTop = "192px";
    bounds["report-overview"] = [-400, -100];
    bounds["report-findings"] = [192, 1500];
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(
        screen
          .getByRole("link", { name: "Findings" })
          .getAttribute("aria-current"),
      ).toBe("location"),
    );
  });
});
