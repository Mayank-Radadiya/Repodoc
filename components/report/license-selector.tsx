"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import type { SupportedLicenseId } from "@/lib/templates/licenses";
import { useReportTheme } from "./theme-scope";

export type LicenseChoice = Exclude<SupportedLicenseId, "GPL-3.0">;

export interface LicenseSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: { licenseChoice: LicenseChoice }) => void;
  finalFocus?: ComponentProps<typeof DialogPopup>["finalFocus"];
}

// Summaries checked against https://choosealicense.com/licenses/.
// GPL uses the version-3-only grant in the bundled template, not the legacy alias.
const LICENSE_OPTIONS = [
  {
    id: "MIT",
    label: "MIT",
    description:
      "Permissive terms requiring preservation of copyright and license notices.",
  },
  {
    id: "Apache-2.0",
    label: "Apache-2.0",
    description:
      "Permissive terms with an explicit patent grant and requirements to retain notices and state changes.",
  },
  {
    id: "BSD-3-Clause",
    label: "BSD-3-Clause",
    description:
      "Permissive terms requiring notices and prohibiting endorsement using contributors’ names without permission.",
  },
  {
    id: "GPL-3.0-only",
    label: "GPL-3.0 (version 3 only)",
    description:
      "Strong copyleft terms requiring source disclosure and the same license for distributed derivative works.",
  },
  {
    id: "MPL-2.0",
    label: "MPL-2.0",
    description:
      "File-level copyleft terms requiring source disclosure for distributed modifications to covered files.",
  },
] as const satisfies readonly {
  id: LicenseChoice;
  label: string;
  description: string;
}[];

/**
 * Render within ReportThemeScope. The remediation caller must open this before
 * submitting a selected, failed license fix and forward licenseChoice unchanged
 * to /api/remediate. It also owns copyright attribution and request handling.
 * This selector never makes requests or chooses a default license.
 */
export function LicenseSelector(props: LicenseSelectorProps) {
  const { scopeElement } = useReportTheme();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPopup
        finalFocus={props.finalFocus}
        className="max-w-xl motion-reduce:transition-none"
        closeProps={{ className: "absolute inset-e-2 top-2 min-h-11 min-w-11" }}
        portalProps={{ container: scopeElement ?? undefined }}
      >
        {/* Reset on both controlled and user-driven close/reopen transitions. */}
        <LicenseSelectorContent key={String(props.open)} {...props} />
      </DialogPopup>
    </Dialog>
  );
}

function LicenseSelectorContent({
  open,
  onOpenChange,
  onConfirm,
}: LicenseSelectorProps) {
  const id = useId();
  const [licenseChoice, setLicenseChoice] = useState<LicenseChoice | null>(
    null,
  );
  const confirmed = useRef(false);

  function confirm() {
    if (!open || licenseChoice === null || confirmed.current) return;
    confirmed.current = true;
    onConfirm({ licenseChoice });
    onOpenChange(false);
  }

  return (
    <>
      <DialogHeader className="pe-14">
        <DialogTitle>Choose a license</DialogTitle>
        <DialogDescription>
          Choose how others may use your project before continuing with the
          license fix. No license is selected for you.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <RadioGroup
          aria-label="Open-source license"
          aria-describedby={`${id}-disclaimer`}
          name={`${id}-license`}
          required
          value={licenseChoice}
          onValueChange={(value: unknown) => {
            setLicenseChoice(
              LICENSE_OPTIONS.find((option) => option.id === value)?.id ?? null,
            );
          }}
        >
          {LICENSE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-input p-3 has-data-checked:border-primary has-data-checked:bg-accent/50"
              htmlFor={`${id}-${option.id}`}
            >
              <Radio
                id={`${id}-${option.id}`}
                value={option.id}
                aria-labelledby={`${id}-${option.id}-label`}
                aria-describedby={`${id}-${option.id}-description`}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span
                  id={`${id}-${option.id}-label`}
                  className="block text-sm font-medium"
                >
                  {option.label}
                </span>
                <span
                  id={`${id}-${option.id}-description`}
                  className="mt-1 block text-sm text-muted-foreground"
                >
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        <p
          id={`${id}-disclaimer`}
          className="mt-4 text-sm text-muted-foreground"
        >
          These summaries are not legal advice. You are responsible for choosing
          a license for your project.
        </p>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" className="min-h-11" />}>
          Cancel
        </DialogClose>
        <Button
          className="min-h-11"
          disabled={licenseChoice === null}
          onClick={confirm}
        >
          Use selected license
        </Button>
      </DialogFooter>
    </>
  );
}
