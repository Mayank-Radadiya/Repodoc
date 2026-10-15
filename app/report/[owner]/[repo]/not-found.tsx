import Link from "next/link";

export default function ReportNotFound() {
  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold">
        Invalid repository address
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Use a GitHub owner and repository name to open a report.
      </p>
      <Link
        href="/#hero"
        className="mt-6 inline-flex min-h-11 items-center rounded-md font-medium text-blue-600 underline underline-offset-4"
      >
        Audit a repository
      </Link>
    </div>
  );
}
