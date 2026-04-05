"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">secure login</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Sign in to your FixMerge account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card rounded-2xl p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-[13px] font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="mono-label block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-[14px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_20px_var(--accent-glow)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[13px] text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--accent-light)] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
