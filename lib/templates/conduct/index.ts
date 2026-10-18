import { CONTRIBUTOR_COVENANT_V2_1 } from "./contributor-covenant-2-1";

export { CONTRIBUTOR_COVENANT_V2_1 } from "./contributor-covenant-2-1";

export const CODE_OF_CONDUCT_TARGET_PATH = "CODE_OF_CONDUCT.md" as const;
export const CODE_OF_CONDUCT_VERSION = "2.1" as const;
export const DEFAULT_CONTACT_PLACEHOLDER = "[INSERT CONTACT METHOD]" as const;

export interface RenderCodeOfConductOptions {
  /**
   * Contact method for incident reporting (e.g. email address or URL).
   * If omitted or undefined, the standard `[INSERT CONTACT METHOD]` placeholder is preserved.
   */
  contactMethod?: string;
}

/**
 * Renders the canonical Contributor Covenant v2.1 template.
 *
 * If a contact method is provided (either as a string or via `{ contactMethod }`),
 * `[INSERT CONTACT METHOD]` is replaced with the supplied value.
 * Surrounding whitespace is trimmed.
 *
 * Throws a TypeError if the contact method or options argument is invalid,
 * blank, or contains newlines.
 *
 * @param options - Optional contact method string or options object
 * @returns The complete rendered Contributor Covenant v2.1 text
 */
export function renderCodeOfConduct(
  options?: string | RenderCodeOfConductOptions,
): string {
  if (options === undefined || options === null) {
    return CONTRIBUTOR_COVENANT_V2_1;
  }

  let rawContact: string | undefined;

  if (typeof options === "string") {
    rawContact = options;
  } else if (typeof options === "object" && !Array.isArray(options)) {
    if (options.contactMethod !== undefined) {
      if (typeof options.contactMethod !== "string") {
        throw new TypeError(
          "Code of Conduct contact method must be a nonblank, single-line string.",
        );
      }
      rawContact = options.contactMethod;
    }
  } else {
    throw new TypeError(
      "renderCodeOfConduct expects an optional string or options object.",
    );
  }

  if (rawContact === undefined) {
    return CONTRIBUTOR_COVENANT_V2_1;
  }

  if (
    rawContact.trim().length === 0 ||
    /[\r\n\u2028\u2029]/.test(rawContact)
  ) {
    throw new TypeError(
      "Code of Conduct contact method must be a nonblank, single-line string.",
    );
  }

  const contactMethod = rawContact.trim();

  // Replacer function prevents interpretation of special substitution patterns like $&, $1, etc.
  return CONTRIBUTOR_COVENANT_V2_1.replace(
    DEFAULT_CONTACT_PLACEHOLDER,
    () => contactMethod,
  );
}
