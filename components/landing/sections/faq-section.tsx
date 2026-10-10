"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FAQ_ITEMS } from "../data/faq";

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
              How Repodoc interacts with GitHub APIs, scores repository health,
              and generates atomic pull requests.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="border-t border-slate-200">
              {FAQ_ITEMS.map((item, index) => {
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
