import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixMerge",
  description: "PR quality gate — catches bugs before they ship",
};

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      {/* Rounded square base with gradient */}
      <rect width="30" height="30" rx="8" fill="url(#fm-grad)" />
      {/* Git merge branch lines */}
      <path
        d="M10 8v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Top dots - two branches */}
      <circle cx="10" cy="7" r="2" fill="white" opacity="0.9" />
      <circle cx="20" cy="7" r="2" fill="white" opacity="0.9" />
      {/* Bottom merge point with checkmark */}
      <circle cx="15" cy="22" r="3" fill="white" opacity="0.9" />
      {/* Merge lines converging */}
      <path
        d="M10 14l5 5M20 14l-5 5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* Small checkmark in merge point */}
      <path
        d="M13.5 22l1 1 2-2"
        stroke="url(#fm-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="fm-grad" x1="0" y1="0" x2="30" y2="30">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        <div className="grid-bg" />
        <div className="mesh-bg" />
        <div className="scan-line" />

        <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg-root)]/80 backdrop-blur-xl">
          <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <Logo />
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-extrabold tracking-tight text-gradient">
                  FixMerge
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase text-[var(--accent)] bg-[var(--accent-glow)] border border-[var(--accent)]/15">
                  beta
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
              >
                Dashboard
              </Link>
              <a
                href="/api/analyses"
                target="_blank"
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
              >
                API
              </a>
              <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-default)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                <span>online</span>
              </div>
            </nav>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
