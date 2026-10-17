// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CODE_OF_CONDUCT_TARGET_PATH,
  CODE_OF_CONDUCT_VERSION,
  CONTRIBUTOR_COVENANT_V2_1,
  DEFAULT_CONTACT_PLACEHOLDER,
  renderCodeOfConduct,
} from "..";
import * as rootAliasConduct from "@/lib/templates/conduct";

const PINNED_V2_1_SHA256 =
  "369bf7301883368fc19203bd0f1233fed2b83f0378ad19c4d0708bf61925339b";

describe("Contributor Covenant v2.1 template", () => {
  it("matches the canonical Contributor Covenant v2.1 text and SHA-256 hash", () => {
    const hash = createHash("sha256")
      .update(CONTRIBUTOR_COVENANT_V2_1)
      .digest("hex");

    expect(hash).toBe(PINNED_V2_1_SHA256);
    expect(CONTRIBUTOR_COVENANT_V2_1.endsWith("\n")).toBe(true);
    expect(CONTRIBUTOR_COVENANT_V2_1).not.toContain("\r");
  });

  it("exports expected metadata constants and supports root alias re-export", () => {
    expect(CODE_OF_CONDUCT_TARGET_PATH).toBe("CODE_OF_CONDUCT.md");
    expect(CODE_OF_CONDUCT_VERSION).toBe("2.1");
    expect(DEFAULT_CONTACT_PLACEHOLDER).toBe("[INSERT CONTACT METHOD]");
    expect(rootAliasConduct.CODE_OF_CONDUCT_TARGET_PATH).toBe(
      "CODE_OF_CONDUCT.md",
    );
    expect(rootAliasConduct.renderCodeOfConduct).toBe(renderCodeOfConduct);
    expect(rootAliasConduct.CONTRIBUTOR_COVENANT_V2_1).toBe(
      CONTRIBUTOR_COVENANT_V2_1,
    );
    expect(rootAliasConduct.CODE_OF_CONDUCT_VERSION).toBe("2.1");
    expect(rootAliasConduct.DEFAULT_CONTACT_PLACEHOLDER).toBe(
      "[INSERT CONTACT METHOD]",
    );
  });

  it("contains all standard Contributor Covenant v2.1 headings and sections", () => {
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain(
      "# Contributor Covenant Code of Conduct\n",
    );
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Our Pledge\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Our Standards\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain(
      "## Enforcement Responsibilities\n",
    );
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Scope\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Enforcement\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Enforcement Guidelines\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("### 1. Correction\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("### 2. Warning\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("### 3. Temporary Ban\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("### 4. Permanent Ban\n");
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain("## Attribution\n");
  });

  it("includes protected characteristics added in version 2.1 (caste, color)", () => {
    expect(CONTRIBUTOR_COVENANT_V2_1).toContain(
      "race, caste, color, religion, or sexual identity and orientation.",
    );
  });
});

describe("renderCodeOfConduct", () => {
  it("renders verbatim canonical text with default placeholder when called without arguments", () => {
    const result = renderCodeOfConduct();

    expect(result).toBe(CONTRIBUTOR_COVENANT_V2_1);
    expect(result).toContain(
      "reported to the community leaders responsible for enforcement at [INSERT CONTACT METHOD].",
    );
  });

  it("renders verbatim canonical text when passed undefined or empty options object", () => {
    expect(renderCodeOfConduct(undefined)).toBe(CONTRIBUTOR_COVENANT_V2_1);
    expect(renderCodeOfConduct({})).toBe(CONTRIBUTOR_COVENANT_V2_1);
    expect(renderCodeOfConduct({ contactMethod: undefined })).toBe(
      CONTRIBUTOR_COVENANT_V2_1,
    );
  });

  it("substitutes the contact method when provided as a string", () => {
    const result = renderCodeOfConduct("conduct@repodoc.dev");

    expect(result).toContain(
      "reported to the community leaders responsible for enforcement at conduct@repodoc.dev.",
    );
    expect(result).not.toContain("[INSERT CONTACT METHOD]");
  });

  it("substitutes the contact method when provided in an options object", () => {
    const result = renderCodeOfConduct({
      contactMethod: "https://repodoc.dev/conduct-reports",
    });

    expect(result).toContain(
      "reported to the community leaders responsible for enforcement at https://repodoc.dev/conduct-reports.",
    );
    expect(result).not.toContain("[INSERT CONTACT METHOD]");
  });

  it("trims surrounding whitespace from the contact method", () => {
    const result = renderCodeOfConduct("   maintainers@example.com\t  ");

    expect(result).toContain(
      "reported to the community leaders responsible for enforcement at maintainers@example.com.",
    );
    expect(result).not.toContain("   maintainers@example.com");
  });

  it("preserves literal regex substitution syntax in contact method", () => {
    const strangeContact = "contact+$&+$1+$`+$'+$$@example.com";
    const result = renderCodeOfConduct(strangeContact);

    expect(result).toContain(
      `reported to the community leaders responsible for enforcement at ${strangeContact}.`,
    );
  });

  it("preserves Unicode and international contact methods literally", () => {
    const unicodeContact = "comissão-de-conduta@exemplo.org";
    const result = renderCodeOfConduct(unicodeContact);

    expect(result).toContain(
      `reported to the community leaders responsible for enforcement at ${unicodeContact}.`,
    );
  });

  it("does not mutate the canonical template between rendering invocations", () => {
    const custom = renderCodeOfConduct("first@example.com");
    expect(custom).toContain("first@example.com");

    const defaultAgain = renderCodeOfConduct();
    expect(defaultAgain).toBe(CONTRIBUTOR_COVENANT_V2_1);
    expect(defaultAgain).toContain("[INSERT CONTACT METHOD]");
  });

  it.each(["", "   ", "\t", "\n"])(
    "rejects blank contact method string %j with TypeError",
    (contact) => {
      expect(() => renderCodeOfConduct(contact)).toThrow(
        "Code of Conduct contact method must be a nonblank, single-line string.",
      );
    },
  );

  it.each([
    "lead@example.com\nadmin@example.com",
    "lead@example.com\radmin@example.com",
    "lead@example.com\r\nadmin@example.com",
    "lead@example.com\u2028admin@example.com",
    "lead@example.com\u2029admin@example.com",
  ])("rejects multiline contact method %j with TypeError", (contact) => {
    expect(() => renderCodeOfConduct(contact)).toThrow(
      "Code of Conduct contact method must be a nonblank, single-line string.",
    );
  });

  it.each([123, true, false, Symbol("contact")])(
    "rejects non-string/non-options-object argument %s with TypeError",
    (invalidArg) => {
      expect(() =>
        renderCodeOfConduct(invalidArg as unknown as string),
      ).toThrow(TypeError);
    },
  );

  it("rejects array argument with TypeError", () => {
    expect(() =>
      renderCodeOfConduct(["contact@example.com"] as unknown as string),
    ).toThrow(TypeError);
  });

  it.each([123, true, false, Symbol("contact")])(
    "rejects non-string contactMethod in options object with TypeError",
    (invalidContact) => {
      expect(() =>
        renderCodeOfConduct({
          contactMethod: invalidContact as unknown as string,
        }),
      ).toThrow(TypeError);
    },
  );

  it("rejects array contactMethod in options object with TypeError", () => {
    expect(() =>
      renderCodeOfConduct({
        contactMethod: ["contact@example.com"] as unknown as string,
      }),
    ).toThrow(TypeError);
  });
});
