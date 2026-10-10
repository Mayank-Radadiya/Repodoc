"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How does single-roundtrip Git tree traversal prevent N+1 API cascades?",
    answer:
      "Repodoc queries GitHub's low-level Git Trees API once (GET /git/trees/{sha}?recursive=1). This returns the repository's entire file tree in one JSON payload, allowing the audit engine to execute 90%+ of presence checks in memory in under 1ms. Furthermore, we leverage HTTP Conditional Requests (ETag / If-None-Match) so 304 Not Modified responses consume zero unauthenticated rate-limit quota.",
  },
  {
    question: "Why does Repodoc avoid README word count metrics?",
    answer:
      "Word count is a vanity proxy that penalizes concise documentation. Repodoc parses Markdown ASTs into structured heading tokens, verifying the presence of essential sections (e.g. Installation/Setup, Usage/Quickstart, Architecture Overview) regardless of length.",
  },
  {
    question: "Why doesn't Repodoc automatically choose an open-source license?",
    answer:
      "Selecting an open-source license is a legal decision that impacts patent rights and redistribution terms (e.g. Apache 2.0 vs MIT vs BSD 3-Clause). Repodoc enforces maintainer agency: the UI explicitly prompts the user to select their desired license before opening a remediation pull request.",
  },
  {
    question: "How does the scoring engine differentiate libraries from applications?",
    answer:
      "Repodoc analyzes root package manifests (package.json, Cargo.toml, setup.py, go.mod). If a project specifies 'exports' or 'main' and no CLI 'bin' entry, it is classified as a library and is never penalized for lacking frontend web assets or application deployment files.",
  },
  {
    question: "Does the atomic remediation engine ever overwrite existing files?",
    answer:
      "Never. The remediation engine checks whether each target file already exists in the repository tree. If a file exists, it is excluded from the Git tree payload to prevent accidental data loss or regression.",
  },
  {
    question: "How does the Shields.io dynamic badge API work?",
    answer:
      "Rather than running a slow server-side SVG/PNG canvas renderer, Repodoc serves standard shields.io endpoint JSON at /api/badge/:owner/:repo with cache-control headers. Shields.io queries this endpoint and delivers CDN-cached SVG badges directly to your README.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative scroll-mt-24 py-16 lg:py-24 border-t border-white/8 bg-[#06080d]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs font-medium text-slate-300">
            <HelpCircle className="size-3.5 text-sky-400" />
            <span>Developer Truths</span>
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base leading-relaxed">
            Everything you need to know about our scoring rubric, Git data engine, and shields.io API.
          </p>
        </div>

        {/* ── FAQ Accordion ── */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-white/8 bg-[#0a0f18] transition-colors hover:border-white/14"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-4 text-left sm:p-5"
                >
                  <span className="font-display text-sm font-semibold text-slate-200 sm:text-base pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`size-4.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-white/6 px-4 pt-3 pb-5 sm:px-5">
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
