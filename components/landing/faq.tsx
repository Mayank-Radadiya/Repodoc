"use client";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import styles from "./landing.module.css";

const questions = [
  {
    question: "What does the health score measure?",
    answer:
      "The versioned rubric measures repository essentials across documentation (25 points), project hygiene (20), testing and CI (25), community and metadata (15), and security baseline (15). It is a useful project baseline, rather than a measure of code quality or a security certification.",
  },
  {
    question: "What is behind each finding?",
    answer:
      "Every sample check shows the file inspected, the evidence, the points awarded, and a recommended next step. README checks examine useful sections such as installation and usage, rather than rewarding word counts.",
  },
  {
    question: "Can I audit my own repository here?",
    answer:
      "This page is an interactive preview using a fictional Node.js repository. You can explore the complete sample report without signing in. Live public GitHub audits and repository connections are planned; this preview does not contact or change your repositories.",
  },
  {
    question: "How does remediation work?",
    answer:
      "The PR preview shows a Node.js .gitignore and a CI workflow bundled into one commit. The planned remediation flow adds missing files in one reviewable pull request, with the maintainer deciding what to merge. Nothing is created on GitHub from this demo.",
  },
  {
    question: "What happens to existing files and licenses?",
    answer:
      "Remediation is designed to add only missing essentials and preserve existing files. A missing license always requires an explicit maintainer choice; Repodoc will not choose one automatically. The sample repository already has an MIT license, so no license change is proposed.",
  },
  {
    question: "Can I use the README health badge?",
    answer:
      "You can preview the badge and copy the example Markdown now. Its deployment address is a placeholder. A working badge will use the planned Shields.io endpoint when live audits are available, linking contributors to the full report.",
  },
];

export function Faq() {
  return (
    <Accordion className={styles.faqList}>
      {questions.map((item, index) => (
        <AccordionItem
          value={`faq-${index}`}
          key={item.question}
          className={styles.faqItem}
        >
          <AccordionTrigger className={styles.faqTrigger}>
            <span>{item.question}</span>
            <span aria-hidden="true" className={styles.faqPlus} />
          </AccordionTrigger>
          <AccordionPanel className={styles.faqAnswer}>
            {item.answer}
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
