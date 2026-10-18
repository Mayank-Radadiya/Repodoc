import { MIT_LICENSE } from "./mit";
import { APACHE_2_0_LICENSE } from "./apache-2.0";
import { BSD_3_CLAUSE_LICENSE } from "./bsd-3-clause";
import { GPL_3_0_LICENSE } from "./gpl-3.0";
import { MPL_2_0_LICENSE } from "./mpl-2.0";

export {
  MIT_LICENSE,
  APACHE_2_0_LICENSE,
  BSD_3_CLAUSE_LICENSE,
  GPL_3_0_LICENSE,
  MPL_2_0_LICENSE,
};

export const LICENSE_TARGET_PATH = "LICENSE" as const;

/** GPL-3.0 is a legacy alias for GPL-3.0-only, not a separate license choice. */
export const SUPPORTED_LICENSE_IDS = Object.freeze([
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "GPL-3.0-only",
  "MPL-2.0",
  "GPL-3.0",
] as const);

export type SupportedLicenseId = (typeof SUPPORTED_LICENSE_IDS)[number];

const templates: Readonly<Record<SupportedLicenseId, string>> = {
  MIT: MIT_LICENSE,
  "Apache-2.0": APACHE_2_0_LICENSE,
  "BSD-3-Clause": BSD_3_CLAUSE_LICENSE,
  "GPL-3.0-only": GPL_3_0_LICENSE,
  "MPL-2.0": MPL_2_0_LICENSE,
  "GPL-3.0": GPL_3_0_LICENSE,
};

/**
 * Render a caller-selected license with a four-digit year and copyright holder.
 * Throws for unsupported identifiers or invalid attribution; never selects a default.
 */
export function renderLicense(
  spdxId: string,
  year: number,
  fullName: string,
): string {
  if (
    typeof spdxId !== "string" ||
    !Object.prototype.hasOwnProperty.call(templates, spdxId)
  ) {
    throw new TypeError("Unsupported license identifier.");
  }

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError("License year must be a four-digit integer (1000–9999).");
  }

  if (
    typeof fullName !== "string" ||
    fullName.trim().length === 0 ||
    /[\r\n\u2028\u2029]/.test(fullName)
  ) {
    throw new TypeError("License full name must be a nonblank, single-line string.");
  }

  const name = fullName.trim();
  // The own-property check above restricts this string to SupportedLicenseId.
  const template = templates[spdxId as SupportedLicenseId];

  // One pass prevents replacement syntax or placeholder-like names being interpreted.
  return template.replace(/\{\{(year|fullname)\}\}/g, (_match, token: string) =>
    token === "year" ? String(year) : name,
  );
}
