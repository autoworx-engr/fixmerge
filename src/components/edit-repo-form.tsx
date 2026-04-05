"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function EditRepoForm({
  projectId,
  initialRepo,
  variant = "inline",
}: {
  projectId: number;
  initialRepo: string;
  variant?: "inline" | "compact";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialRepo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialRepo);
  }, [initialRepo]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(initialRepo);
          setError(null);
          setOpen(true);
        }}
        className={
          variant === "compact"
            ? "text-[11px] font-mono font-semibold text-[var(--accent-light)] hover:underline cursor-pointer shrink-0"
            : "px-3 py-1.5 rounded-lg text-[12px] font-mono font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent-light)] transition-colors cursor-pointer"
        }
      >
        Update repo URL
      </button>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoFullName: value }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Update failed");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className={
        variant === "compact"
          ? "flex flex-wrap items-center gap-2 w-full sm:w-auto"
          : "flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2"
      }
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="owner/repo"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border-default)] text-[13px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/50"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded-lg text-[12px] font-mono font-bold bg-[var(--accent)] text-white disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue(initialRepo);
            setError(null);
          }}
          className="px-3 py-2 rounded-lg text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-[12px] text-red-400 font-mono w-full">{error}</p>
      )}
      <p className="text-[11px] text-[var(--text-muted)] font-mono w-full">
        Use <code className="text-[var(--accent-light)]">owner/repo</code> or a
        full GitHub URL. Past analyses for the old path are relabeled to this
        repo. Update your GitHub webhook if the repository moved.
      </p>
    </form>
  );
}
