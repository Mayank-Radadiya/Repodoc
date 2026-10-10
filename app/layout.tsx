import type { Metadata } from "next";
import { Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Repodoc — Repository Intelligence & Automated Health Remediation",
  description:
    "Instant 100-point repository health audit with defensible evidence, dynamic shields.io badge, and 1-click atomic PR remediation in a single commit.",
  openGraph: {
    title: "Repodoc — Repository Intelligence & Automated Health Remediation",
    description:
      "Instant 100-point repository health audit with defensible evidence, dynamic shields.io badge, and 1-click atomic PR remediation in a single commit.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
