// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LICENSE_TARGET_PATH,
  renderLicense,
  SUPPORTED_LICENSE_IDS,
} from "..";
import * as rootAliasLicenses from "@/lib/templates/licenses";
import { MIT_LICENSE } from "../mit";
import { APACHE_2_0_LICENSE } from "../apache-2.0";
import { BSD_3_CLAUSE_LICENSE } from "../bsd-3-clause";
import { GPL_3_0_LICENSE } from "../gpl-3.0";
import { MPL_2_0_LICENSE } from "../mpl-2.0";

const canonicalTemplates = [
  { id: "MIT", text: MIT_LICENSE },
  { id: "Apache-2.0", text: APACHE_2_0_LICENSE },
  { id: "BSD-3-Clause", text: BSD_3_CLAUSE_LICENSE },
  { id: "GPL-3.0-only", text: GPL_3_0_LICENSE },
  { id: "MPL-2.0", text: MPL_2_0_LICENSE },
] as const;

describe("renderLicense", () => {
  it("renders the MIT license with the supplied year and copyright holder", () => {
    const result = renderLicense("MIT", 2026, "Example Contributors");

    expect(result).toContain("Copyright (c) 2026 Example Contributors");
    expect(result).toContain("Permission is hereby granted, free of charge");
    expect(result).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it.each(canonicalTemplates)("renders complete $id text with both placeholders filled", ({ id, text }) => {
    expect(text).toContain("{{year}}");
    expect(text).toContain("{{fullname}}");

    const result = renderLicense(id, 2025, "Ada Lovelace");
    expect(result).toContain("2025 Ada Lovelace");
    expect(result).not.toMatch(/\{\{(?:year|fullname)\}\}/);
    expect(result).not.toContain("\r");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("exposes exactly the five requested identifiers plus the canonical GPL spelling", () => {
    expect([...SUPPORTED_LICENSE_IDS].sort()).toEqual([
      "MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "GPL-3.0-only", "MPL-2.0",
    ].sort());
    expect(Object.isFrozen(SUPPORTED_LICENSE_IDS)).toBe(true);
  });

  it("exports LICENSE_TARGET_PATH and individual templates with root alias parity", () => {
    expect(LICENSE_TARGET_PATH).toBe("LICENSE");
    expect(rootAliasLicenses.LICENSE_TARGET_PATH).toBe("LICENSE");
    expect(rootAliasLicenses.renderLicense).toBe(renderLicense);
    expect(rootAliasLicenses.MIT_LICENSE).toBe(MIT_LICENSE);
    expect(rootAliasLicenses.APACHE_2_0_LICENSE).toBe(APACHE_2_0_LICENSE);
    expect(rootAliasLicenses.BSD_3_CLAUSE_LICENSE).toBe(BSD_3_CLAUSE_LICENSE);
    expect(rootAliasLicenses.GPL_3_0_LICENSE).toBe(GPL_3_0_LICENSE);
    expect(rootAliasLicenses.MPL_2_0_LICENSE).toBe(MPL_2_0_LICENSE);
    expect(rootAliasLicenses.SUPPORTED_LICENSE_IDS).toBe(SUPPORTED_LICENSE_IDS);
  });

  it("maps GPL-3.0 to version 3 only and preserves FSF attribution and application examples", () => {
    const result = renderLicense("GPL-3.0", 2026, "Example Contributors");
    expect(result).toBe(renderLicense("GPL-3.0-only", 2026, "Example Contributors"));
    expect(result).toContain("SPDX-License-Identifier: GPL-3.0-only");
    expect(result).toContain("the Free Software Foundation, version 3 only.");
    expect(result).toContain("Copyright © 2007 Free Software Foundation, Inc.");
    expect(result).toContain("How to Apply These Terms to Your New Programs");
    expect(result).toContain("Copyright (C) <year>  <name of author>");
  });

  it("preserves Apache's appendix and MPL's exhibits", () => {
    expect(renderLicense("Apache-2.0", 2026, "Example Contributors"))
      .toContain("APPENDIX: How to apply the Apache License to your work.");
    const mpl = renderLicense("MPL-2.0", 2026, "Example Contributors");
    expect(mpl).toContain("Exhibit A - Source Code Form License Notice");
    expect(mpl).toContain('Exhibit B - "Incompatible With Secondary Licenses" Notice');
  });

  it.each(SUPPORTED_LICENSE_IDS)("preserves Unicode and replacement syntax literally for %s", (id) => {
    const name = "Élodie 李 $& $$ $` $' {{year}} {{fullname}}";
    expect(renderLicense(id, 2026, name)).toContain(`2026 ${name}`);
  });

  it("trims surrounding whitespace and accepts boundary years", () => {
    expect(renderLicense("MIT", 1000, "  Example Contributors\t "))
      .toContain("Copyright (c) 1000 Example Contributors\n");
    expect(renderLicense("MIT", 9999, "Example Contributors")).toContain("9999 Example Contributors");
  });

  it("does not share attribution between calls", () => {
    const first = renderLicense("MIT", 2024, "First Author");
    const second = renderLicense("MIT", 2026, "Second Author");
    expect(first).toContain("2024 First Author");
    expect(second).toContain("2026 Second Author");
    expect(second).not.toContain("First Author");
    expect(renderLicense("MIT", 2024, "First Author")).toBe(first);
    expect(MIT_LICENSE).toContain("{{year}} {{fullname}}");
  });

  it.each(["", "ISC", "mit", " MIT ", "GPL-3.0-or-later", "__proto__", "constructor", "toString", "hasOwnProperty"])(
    "rejects unsupported identifier %j without selecting a default", (id) => {
      expect(() => renderLicense(id, 2026, "Example Contributors")).toThrow("Unsupported license identifier");
    },
  );

  it.each([999, 10000, 0, -2026, 2026.5, NaN, Infinity, -Infinity])("rejects invalid year %s", (year) => {
    expect(() => renderLicense("MIT", year, "Example Contributors")).toThrow("four-digit integer");
  });

  it.each(["", "  \t ", "Alice\nBob", "Alice\rBob", "Alice\r\nBob", "Alice\u2028Bob", "Alice\u2029Bob", "Alice\n"])(
    "rejects blank or multiline name %j", (name) => {
      expect(() => renderLicense("MIT", 2026, name)).toThrow("nonblank, single-line string");
    },
  );

  it.each([
    [null, 2026, "Example Contributors"],
    [42, 2026, "Example Contributors"],
    ["MIT", "2026", "Example Contributors"],
    ["MIT", 2026, null],
    ["MIT", 2026, 42],
  ])("rejects runtime type violations (%j, %j, %j)", (...args) => {
    expect(() => Reflect.apply(renderLicense, undefined, args)).toThrow();
  });
});

describe("pinned SPDX text integrity", () => {
  // SHA-256 values of the original UTF-8 files at SPDX license-list-data
  // d46e94e2c78ceede1cfc63cfa0396472d2798d4c (v3.27.0), fetched independently.
  const originals = [
    {
      id: "MIT",
      text: MIT_LICENSE.replace("{{year}} {{fullname}}", "<year> <copyright holders>"),
      sha256: "b05785f9f18e6716bab63424b11454513b9943a222595b70411009202fc592b5",
    },
    {
      id: "Apache-2.0",
      text: APACHE_2_0_LICENSE.replace("{{year}} {{fullname}}", "[yyyy] [name of copyright owner]"),
      sha256: "074e6e32c86a4c0ef8b3ed25b721ca23aca83df277cd88106ef7177c354615ff",
    },
    {
      id: "BSD-3-Clause",
      text: BSD_3_CLAUSE_LICENSE.replace("{{year}} {{fullname}}.\n", "<year> <owner>. \n"),
      sha256: "5a93d5831e1297ab10fe643e1a631e83be392896da14ee2951285a79012df69d",
    },
    {
      id: "GPL-3.0-only",
      text: GPL_3_0_LICENSE.slice(GPL_3_0_LICENSE.indexOf("GNU GENERAL PUBLIC LICENSE")),
      sha256: "fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0",
    },
    {
      id: "MPL-2.0",
      text: MPL_2_0_LICENSE.slice(MPL_2_0_LICENSE.indexOf("Mozilla Public License Version 2.0")),
      sha256: "66a3107d5ad6a058aab753eaac2047ccb2ed0e39465dd0fe5844da3e300d5172",
    },
  ];

  it.each(originals)("preserves the entire $id source apart from documented attribution", ({ text, sha256 }) => {
    expect(createHash("sha256").update(text, "utf8").digest("hex")).toBe(sha256);
  });
});
