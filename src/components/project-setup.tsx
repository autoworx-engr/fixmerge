"use client";

import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-[var(--accent-glow)] text-[var(--accent-light)] hover:bg-[var(--accent)]/20 transition-all cursor-pointer shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SecretToggle({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-[13px] font-mono text-[var(--accent-light)] truncate">
        {visible ? value : "••••••••••••••••••••••••••••••••••••"}
      </code>
      <button
        onClick={() => setVisible(!visible)}
        className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shrink-0"
      >
        {visible ? "Hide" : "Reveal"}
      </button>
      <CopyButton text={value} />
    </div>
  );
}

export function ProjectSetup({
  repoFullName,
  webhookSecret,
  apiKey,
}: {
  repoFullName: string;
  webhookSecret: string;
  apiKey: string;
}) {
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook/github`
      : "/api/webhook/github";

  return (
    <div className="card rounded-2xl p-6 mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)]" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--accent-light)]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">Set up your webhook</h2>
          <p className="text-[13px] text-[var(--text-secondary)]">
            Connect <span className="font-mono text-[var(--accent-light)]">{repoFullName}</span> to start analyzing PRs
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Step 1 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</div>
            <div className="w-px flex-1 bg-[var(--border-default)] mt-1" />
          </div>
          <div className="flex-1 pb-5">
            <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">
              Go to your repo&apos;s webhook settings
            </p>
            <a
              href={`https://github.com/${repoFullName}/settings/hooks/new`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--accent-light)] hover:border-[var(--accent)]/30 transition-all"
            >
              Open GitHub settings
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</div>
            <div className="w-px flex-1 bg-[var(--border-default)] mt-1" />
          </div>
          <div className="flex-1 pb-5">
            <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
              Set the Payload URL
            </p>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
              <code className="flex-1 text-[13px] font-mono text-[var(--accent-light)] truncate">
                {webhookUrl}
              </code>
              <CopyButton text={webhookUrl} />
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Content type: <code className="text-[var(--text-secondary)]">application/json</code>
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</div>
            <div className="w-px flex-1 bg-[var(--border-default)] mt-1" />
          </div>
          <div className="flex-1 pb-5">
            <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">
              Set the Secret
            </p>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
              <SecretToggle value={webhookSecret} />
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">4</div>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-2">
              Select events
            </p>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Choose <strong>&quot;Let me select individual events&quot;</strong> and check <strong>&quot;Pull requests&quot;</strong> only.
            </p>
          </div>
        </div>
      </div>

      {/* API Key */}
      <div className="mt-6 pt-5 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--text-muted)]">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <span className="mono-label">your api key</span>
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
          <SecretToggle value={apiKey} />
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">
          Use this key to authenticate REST API requests. See the <a href="/docs" className="text-[var(--accent-light)] hover:underline">docs</a> for details.
        </p>
      </div>
    </div>
  );
}
