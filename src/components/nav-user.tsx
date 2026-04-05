"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavUser({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--accent-glow)] transition-all cursor-pointer"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-secondary)] flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{initials}</span>
        </div>
        <span className="text-[13px] font-medium text-[var(--text-secondary)] hidden sm:inline">
          {name}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 card rounded-xl p-1.5 border border-[var(--border-hover)] shadow-2xl z-50">
          <div className="px-3 py-2.5 border-b border-[var(--border-default)] mb-1.5">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-red-400 hover:bg-red-500/8 transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
