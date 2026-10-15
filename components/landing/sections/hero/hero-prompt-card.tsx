"use client";

import { UrlInput } from "@/components/report/url-input";

export function HeroPromptCard() {
  return (
    <div className="mx-auto mt-10 w-full max-w-2xl rounded-[22px] bg-white/25 p-1 shadow-(--shadow-overlay) ring-1 ring-white/40 backdrop-blur-md sm:mt-12">
      <div className="dark rounded-[18px] bg-slate-950/90 p-4 text-left text-slate-100 sm:p-5">
        <UrlInput
          label="GitHub repository"
          placeholder="github.com/facebook/react"
          className="[&_input]:border-slate-600 [&_input]:bg-slate-900 [&_input]:text-white [&_input]:placeholder:text-slate-400 [&_button]:border-blue-600 [&_button]:bg-blue-600 [&_button]:text-white [&_button]:hover:bg-blue-700"
        />
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Enter a public repository to inspect its docs, testing, and project
          hygiene.
        </p>
      </div>
    </div>
  );
}
