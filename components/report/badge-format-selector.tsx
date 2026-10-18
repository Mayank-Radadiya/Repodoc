"use client";

import { TabsList, TabsTab } from "@/components/ui/tabs";

export type BadgeSnippetFormat = "markdown" | "html" | "url";

export interface BadgeFormatItem {
  value: BadgeSnippetFormat;
  label: string;
  copyLabel: string;
}

export const FORMATS: BadgeFormatItem[] = [
  { value: "markdown", label: "Markdown", copyLabel: "Markdown" },
  { value: "html", label: "HTML", copyLabel: "HTML" },
  { value: "url", label: "Image URL", copyLabel: "URL" },
];

export interface BadgeFormatSelectorProps {
  className?: string;
}

export function BadgeFormatSelector({ className }: BadgeFormatSelectorProps) {
  return (
    <TabsList
      activateOnFocus
      aria-label="Embed snippet format"
      className={className}
    >
      {FORMATS.map(({ value, label }) => (
        <TabsTab
          key={value}
          value={value}
          className="min-h-11 px-2.5 text-sm focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 sm:min-h-11"
        >
          {label}
        </TabsTab>
      ))}
    </TabsList>
  );
}
