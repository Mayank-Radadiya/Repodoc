import { useState } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import {
  LicenseSelector,
  type LicenseSelectorProps,
} from "../license-selector";
import { LicenseSelector as CompatibilityLicenseSelector } from "@/src/components/report/license-selector";
import { ReportThemeScope } from "../theme-scope";

const choices = [
  { label: "MIT", id: "MIT" },
  { label: "Apache-2.0", id: "Apache-2.0" },
  { label: "BSD-3-Clause", id: "BSD-3-Clause" },
  { label: "GPL-3.0 (version 3 only)", id: "GPL-3.0-only" },
  { label: "MPL-2.0", id: "MPL-2.0" },
] as const;

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderSelector(overrides: Partial<LicenseSelectorProps> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  const result = render(
    <ReportThemeScope>
      <LicenseSelector {...props} />
    </ReportThemeScope>,
  );
  return { ...result, props };
}

function Caller({
  onConfirm = () => {},
  forwardToApi = false,
}: {
  onConfirm?: LicenseSelectorProps["onConfirm"];
  forwardToApi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ReportThemeScope>
      <Button onClick={() => setOpen(true)}>Choose license</Button>
      <LicenseSelector
        open={open}
        onOpenChange={setOpen}
        onConfirm={(selection) => {
          onConfirm(selection);
          if (forwardToApi) {
            void fetch("/api/remediate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                owner: "octocat",
                repo: "hello-world",
                fixes: ["license", "gitignore"],
                ...selection,
              }),
            });
          }
        }}
      />
    </ReportThemeScope>
  );
}

async function openSelector() {
  fireEvent.click(screen.getByRole("button", { name: "Choose license" }));
  return screen.findByRole("dialog", { name: "Choose a license" });
}

function confirmButton() {
  return screen.getByRole<HTMLButtonElement>("button", {
    name: "Use selected license",
  });
}

describe("LicenseSelector", () => {
  it("exposes the same component through the compatibility entry point", () => {
    expect(CompatibilityLicenseSelector).toBe(LicenseSelector);
  });

  it("does not render a dialog or make requests while closed", () => {
    renderSelector({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows five described choices without selecting a default, including on focus", async () => {
    const { props } = renderSelector();
    const dialog = await screen.findByRole("dialog", {
      name: "Choose a license",
    });
    const group = within(dialog).getByRole("radiogroup", {
      name: "Open-source license",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(5);
    for (const choice of choices) {
      const radio = within(group).getByRole("radio", { name: choice.label });
      expect(radio.getAttribute("aria-checked")).toBe("false");
      const description = document.getElementById(
        radio.getAttribute("aria-describedby")!,
      );
      expect(description?.textContent?.length).toBeGreaterThan(20);
    }
    expect(
      document.getElementById(group.getAttribute("aria-describedby")!)
        ?.textContent,
    ).toContain("You are responsible for choosing a license");
    act(() => screen.getByRole("radio", { name: "MIT" }).focus());
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(confirmButton().disabled).toBe(true);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("blocks confirmation without a choice", () => {
    const { props } = renderSelector();
    const button = confirmButton();
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(choices)(
    "confirms $label as $id only after explicit confirmation",
    ({ label, id }) => {
      const { props } = renderSelector();
      fireEvent.click(screen.getByRole("radio", { name: label }));
      expect(
        screen.getByRole("radio", { name: label }).getAttribute("aria-checked"),
      ).toBe("true");
      expect(confirmButton().disabled).toBe(false);
      expect(props.onConfirm).not.toHaveBeenCalled();
      expect(props.onOpenChange).not.toHaveBeenCalled();
      fireEvent.click(confirmButton());
      expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith({
        licenseChoice: id,
      });
      expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("uses the latest choice and suppresses repeat confirmation while closure is pending", () => {
    const { props } = renderSelector();
    fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
    fireEvent.click(screen.getByRole("radio", { name: "MPL-2.0" }));
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    fireEvent.click(confirmButton());
    fireEvent.click(confirmButton());
    expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith({
      licenseChoice: "MPL-2.0",
    });
    expect(props.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("allows clicking the description to select the labelled option", () => {
    renderSelector();
    const radio = screen.getByRole("radio", { name: "MIT" });
    fireEvent.click(
      document.getElementById(radio.getAttribute("aria-describedby")!)!,
    );
    expect(radio.getAttribute("aria-checked")).toBe("true");
    expect(confirmButton().disabled).toBe(false);
  });

  it.each(["Cancel", "Close", "Escape"])(
    "dismisses with %s without confirming and clears the choice on reopening",
    async (action) => {
      const onConfirm = vi.fn();
      render(<Caller onConfirm={onConfirm} />);
      await openSelector();
      fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
      if (action === "Escape") {
        fireEvent.keyDown(document, { key: "Escape" });
      } else {
        fireEvent.click(screen.getByRole("button", { name: action }));
      }
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onConfirm).not.toHaveBeenCalled();
      await openSelector();
      expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
      expect(confirmButton().disabled).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("clears a confirmed choice when reopened", async () => {
    const onConfirm = vi.fn();
    render(<Caller onConfirm={onConfirm} />);
    await openSelector();
    fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
    fireEvent.click(confirmButton());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openSelector();
    expect(confirmButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Apache-2.0" }));
    fireEvent.click(confirmButton());
    expect(onConfirm.mock.calls).toEqual([
      [{ licenseChoice: "MIT" }],
      [{ licenseChoice: "Apache-2.0" }],
    ]);
  });

  it("dismisses an outside click without confirming", async () => {
    const onConfirm = vi.fn();
    render(<Caller onConfirm={onConfirm} />);
    const dialog = await openSelector();
    fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
    const viewport = dialog.closest('[data-slot="dialog-viewport"]')!;
    fireEvent.mouseDown(viewport);
    fireEvent.mouseUp(viewport);
    fireEvent.click(viewport);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a choice when the parent closes and reopens the dialog", async () => {
    const props = { onOpenChange: vi.fn(), onConfirm: vi.fn() };
    const { rerender } = renderSelector(props);
    fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
    rerender(
      <ReportThemeScope>
        <LicenseSelector {...props} open={false} />
      </ReportThemeScope>,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    rerender(
      <ReportThemeScope>
        <LicenseSelector {...props} open />
      </ReportThemeScope>,
    );
    await screen.findByRole("dialog");
    expect(confirmButton().disabled).toBe(true);
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("supports arrow-key selection without submitting on radio Enter", async () => {
    const { props } = renderSelector();
    const mit = screen.getByRole("radio", { name: "MIT" });
    act(() => mit.focus());
    fireEvent.keyDown(mit, { key: "ArrowDown" });
    await waitFor(() => {
      expect(
        screen
          .getByRole("radio", { name: "Apache-2.0" })
          .getAttribute("aria-checked"),
      ).toBe("true");
    });
    const apache = screen.getByRole("radio", { name: "Apache-2.0" });
    expect(document.activeElement).toBe(apache);
    fireEvent.keyDown(apache, { key: "Enter" });
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(confirmButton());
    expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith({
      licenseChoice: "Apache-2.0",
    });
  });

  it("moves focus inside the modal and restores it after dismissal", async () => {
    render(<Caller />);
    const trigger = screen.getByRole("button", { name: "Choose license" });
    act(() => trigger.focus());
    const dialog = await openSelector();
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it.each(["light", "dark"] as const)(
    "keeps the portal inside the %s report theme scope",
    async (theme) => {
      render(
        <ReportThemeScope initialTheme={theme}>
          <LicenseSelector open onOpenChange={vi.fn()} onConfirm={vi.fn()} />
        </ReportThemeScope>,
      );
      const dialog = await screen.findByRole("dialog");
      const scope = screen.getByTestId("report-theme-scope");
      expect(scope.getAttribute("data-theme")).toBe(theme);
      expect(scope.contains(dialog)).toBe(true);
    },
  );
});

describe("LicenseSelector caller handoff (mocked API)", () => {
  it.each(choices)(
    "forwards $id unchanged only after confirmation",
    async ({ label, id }) => {
      render(<Caller forwardToApi />);
      await openSelector();
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("radio", { name: label }));
      expect(fetchMock).not.toHaveBeenCalled();
      fireEvent.click(confirmButton());
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "octocat",
          repo: "hello-world",
          fixes: ["license", "gitignore"],
          licenseChoice: id,
        }),
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    },
  );

  it("never calls the API on empty confirmation or cancellation", async () => {
    render(<Caller forwardToApi />);
    await openSelector();
    fireEvent.click(confirmButton());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await openSelector();
    fireEvent.click(screen.getByRole("radio", { name: "MIT" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
