"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    repoFullName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
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
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-[11px] font-mono text-[var(--text-muted)]">new account</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">
            Create your account
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)]">
            Set up FixMerge for your team in 30 seconds
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
            <label className="mono-label block mb-2">Company / Team Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              placeholder="Acme Inc."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all"
            />
          </div>

          <div>
            <label className="mono-label block mb-2">GitHub Repository</label>
            <input
              type="text"
              value={form.repoFullName}
              onChange={(e) => update("repoFullName", e.target.value)}
              required
              placeholder="owner/repo or https://github.com/owner/repo"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all font-mono"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              The repository FixMerge will analyze. You can add more later.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-[14px] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_20px_var(--accent-glow)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[13px] text-[var(--text-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent-light)] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
