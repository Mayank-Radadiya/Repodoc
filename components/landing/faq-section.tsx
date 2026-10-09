"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const QUESTIONS = [
  {
    question: "How does single-roundtrip tree traversal work?",
    answer:
      "RepoLens calls GitHub's low-level Git Trees API once (GET /git/trees/{sha}?recursive=1). This returns the repository's entire file tree in one JSON payload, allowing the engine to execute 90%+ of file presence checks in memory in under 1ms with zero N+1 API cascades.",
  },
  {
    question: "Will the 1-click PR overwrite any existing files?",
    answer:
      "Never. The remediation engine strictly verifies that candidate hygiene files do not exist in the target tree before generating blobs. Existing project files, custom workflows, or licenses are never modified or overwritten.",
  },
  {
    question: "Why does RepoLens avoid README word count metrics?",
    answer:
      "Word count is a vanity proxy that penalizes concise documentation. RepoLens parses Markdown ASTs into structured heading tokens, verifying the presence of essential sections (e.g., Installation/Setup, Usage/Quickstart) regardless of verbosity.",
  },
  {
    question: "How does the Shields.io badge endpoint work?",
    answer:
      "Rather than running a slow server-side SVG/PNG canvas renderer, RepoLens serves standard shields.io endpoint JSON at /api/badge/[owner]/[repo]. Shields.io queries this endpoint and delivers CDN-cached SVG badges directly to your README.",
  },
  {
    question: "How does RepoLens prevent GitHub rate-limit exhaustion?",
    answer:
      "All audits leverage HTTP Conditional Requests with ETags (If-None-Match). When an audited repository has had no new commits since the last inspection, GitHub returns 304 Not Modified, consuming zero unauthenticated rate-limit quota.",
  },
  {
    question: "Why doesn't RepoLens automatically pick an open-source license?",
    answer:
      "Choosing a software license carries legal implications. The remediation engine identifies missing licenses and prompts maintainers for explicit SPDX selection (MIT, Apache-2.0, BSD-3, MPL-2.0) rather than guessing on their behalf.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-16 sm:py-24 lg:py-28 border-t border-slate-200/70"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16 xl:gap-24">
          <div className="lg:col-span-5">
            <p className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase mb-3">
              Questions, Answered
            </p>
            <h2
              id="faq-heading"
              className="font-display max-w-md text-3xl font-bold text-slate-900 sm:text-4xl lg:text-5xl"
            >
              Everything you need to know before you audit.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 font-light">
              How RepoLens interacts with GitHub APIs, scores repository health,
              and generates atomic pull requests.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="border-t border-slate-200">
              {QUESTIONS.map((item, index) => {
                const isOpen = openIndex === index;
                const contentId = `${panelId}-${index}`;

                return (
                  <div key={item.question} className="border-b border-slate-200">
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left text-base font-normal text-slate-800 sm:py-7 sm:text-lg transition-colors hover:text-[#005FD6]"
                      >
                        <span className="font-medium">{item.question}</span>
                        <span
                          aria-hidden="true"
                          className="relative flex size-6 shrink-0 items-center justify-center text-[#005FD6]"
                        >
                          <span className="absolute h-px w-4 bg-current" />
                          <motion.span
                            className="absolute h-4 w-px bg-current"
                            animate={{ rotate: isOpen ? 90 : 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          />
                        </span>
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={contentId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: {
                              duration: reduceMotion ? 0 : 0.28,
                              ease: [0.16, 1, 0.3, 1],
                            },
                            opacity: { duration: reduceMotion ? 0 : 0.18 },
                          }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pr-10 pb-7 text-sm leading-relaxed text-slate-600 sm:pb-8 sm:text-base font-light">
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
