/** Minimal markdown → HTML for dashboard panels (bold, code, numbered lists). */
export function renderMarkdownLite(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em class="text-[var(--text-muted)] not-italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--bg-root)] text-[11px] font-mono text-[var(--accent-light)] border border-[var(--border-default)]">$1</code>')
    .replace(/^(\d+)\.\s/gm, '<span class="text-[var(--accent-light)] font-mono font-semibold">$1.</span> ')
    .replace(/\n/g, "<br/>");
}
