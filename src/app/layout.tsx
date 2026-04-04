import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NavUser } from "@/components/nav-user";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixMerge",
  description: "PR quality gate — catches bugs before they ship",
};

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="url(#fm-grad)" />
      <path
        d="M10 8v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="10" cy="7" r="2" fill="white" opacity="0.9" />
      <circle cx="20" cy="7" r="2" fill="white" opacity="0.9" />
      <circle cx="15" cy="22" r="3" fill="white" opacity="0.9" />
      <path
        d="M10 14l5 5M20 14l-5 5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = await getSession();

  if (session) {
    const companyExists = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { id: true },
    });
    if (!companyExists) session = null;
  }

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
              {session ? (
                <>
                  <Link
                    href="/"
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/docs"
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
                  >
                    Docs
                  </Link>
                  <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
                  <NavUser name={session.name} email={session.email} />
                </>
              ) : (
                <>
                  <Link
                    href="/docs"
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
                  >
                    Docs
                  </Link>
                  <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[var(--accent)] text-white hover:brightness-110 transition-all"
                  >
                    Get started
                  </Link>
                </>
              )}
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
