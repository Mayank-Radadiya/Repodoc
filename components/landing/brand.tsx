import styles from "./landing.module.css";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${styles.brandMark} ${className}`}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="30" height="30" rx="7" fill="currentColor" />
      <circle
        cx="14"
        cy="14"
        r="8"
        fill="none"
        stroke="var(--logo-cutout, #fff)"
        strokeWidth="1.7"
      />
      <path
        d="m20 20 5 5M11 11v6m0-3h5v-3"
        fill="none"
        stroke="var(--logo-cutout, #fff)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="10" r="1.5" fill="var(--logo-cutout, #fff)" />
      <circle cx="16" cy="10" r="1.5" fill="var(--logo-cutout, #fff)" />
      <circle cx="11" cy="18" r="1.5" fill="var(--logo-cutout, #fff)" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className={styles.brand}>
      <BrandMark />
      <span>Repodoc</span>
    </span>
  );
}

export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .9A11.1 11.1 0 0 0 8.5 22.5c.55.1.76-.24.76-.53v-2.08c-3.1.68-3.76-1.33-3.76-1.33-.51-1.28-1.24-1.62-1.24-1.62-1.01-.7.07-.69.07-.69 1.12.08 1.71 1.14 1.71 1.14 1 1.7 2.6 1.2 3.24.91.1-.72.39-1.2.7-1.47-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.98-.11-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.12-1.44 3.04-1.14 3.04-1.14.61 1.53.23 2.66.12 2.94.7.78 1.14 1.77 1.14 2.98 0 4.27-2.6 5.2-5.08 5.48.4.35.75 1.02.75 2.06v3.09c0 .29.2.63.77.52A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}
