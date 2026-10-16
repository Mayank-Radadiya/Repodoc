"use client";

import { UrlInput } from "@/components/report/url-input";
import { SAMPLE_REPOS } from "../../data/hero";
import styles from "./hero.module.css";

export function HeroPromptCard() {
  return (
    <div data-hero-composer className={styles.composerEntrance}>
      <UrlInput
        label="GitHub repository"
        placeholder="github.com/owner/repo"
        appearance="hero"
        examples={SAMPLE_REPOS.slice(0, 3)}
        className={styles.repositoryForm}
      />
    </div>
  );
}
