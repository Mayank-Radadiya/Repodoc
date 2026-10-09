
const ECOSYSTEMS = [
  {
    name: "TypeScript / Node",
    manifest: "package.json",
    badge: "TS / JS",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    name: "Python",
    manifest: "pyproject.toml",
    badge: "Python",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    name: "Rust",
    manifest: "Cargo.toml",
    badge: "Rust",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    name: "Go",
    manifest: "go.mod",
    badge: "Go",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    name: "Java / Gradle",
    manifest: "pom.xml",
    badge: "Java",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    name: "Container / Cloud",
    manifest: "Dockerfile",
    badge: "OCI",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
];

export function EcosystemStrip() {
  return (
    <section className="border-y border-slate-200/70 bg-slate-50/50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <span className="font-mono text-xs font-semibold tracking-wider text-[#005FD6] uppercase">
              Context-Aware Project Rubric
            </span>
            <p className="mt-1 text-sm text-slate-600 font-light">
              Detects libraries vs. applications from manifests. No penalty for missing app assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {ECOSYSTEMS.map((eco) => (
              <div
                key={eco.name}
                className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-2xs transition-transform hover:-translate-y-0.5"
              >
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${eco.color}`}
                >
                  {eco.badge}
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800">
                    {eco.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {eco.manifest}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default EcosystemStrip;
