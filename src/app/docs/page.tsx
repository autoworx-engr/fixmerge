import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FixMerge — API Documentation",
  description: "Complete API reference for integrating FixMerge into your workflow",
};

function Badge({ children, color = "accent" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    accent: "text-[var(--accent)] bg-[var(--accent-glow)] border-[var(--accent)]/15",
    green: "text-emerald-400 bg-emerald-500/8 border-emerald-500/15",
    amber: "text-amber-400 bg-amber-500/8 border-amber-500/15",
    red: "text-red-400 bg-red-500/8 border-red-500/15",
    violet: "text-violet-400 bg-violet-500/8 border-violet-500/15",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${colors[color] || colors.accent}`}>
      {children}
    </span>
  );
}

function Endpoint({
  method,
  path,
  description,
  auth,
  children,
}: {
  method: string;
  path: string;
  description: string;
  auth?: string;
  children?: React.ReactNode;
}) {
  const methodColors: Record<string, string> = {
    GET: "text-emerald-400",
    POST: "text-amber-400",
    DELETE: "text-red-400",
  };
  return (
    <div className="card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border-default)] flex flex-wrap items-center gap-3">
        <span className={`font-mono text-[14px] font-bold ${methodColors[method] || "text-[var(--text-primary)]"}`}>
          {method}
        </span>
        <code className="font-mono text-[14px] text-[var(--text-primary)]">{path}</code>
        {auth && <Badge color="violet">{auth}</Badge>}
      </div>
      <div className="px-6 py-4">
        <p className="text-[14px] text-[var(--text-secondary)] mb-4">{description}</p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-[var(--border-default)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="w-2 h-2 rounded-full bg-amber-500/60" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          <span className="font-mono text-[11px] text-[var(--text-muted)] ml-1">{title}</span>
        </div>
      )}
      <pre className="px-4 py-3 overflow-x-auto text-[13px] font-mono text-[var(--text-secondary)] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-[860px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse-dot" />
          <span className="text-[11px] font-mono text-[var(--text-muted)]">api reference</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">
          API Documentation
        </h1>
        <p className="text-[16px] text-[var(--text-secondary)] leading-relaxed max-w-[600px]">
          Integrate FixMerge into your CI/CD pipeline, build custom dashboards, or automate your code review workflow.
        </p>
      </div>

      <div className="space-y-12">
        {/* Overview */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[var(--accent)]" />
            Overview
          </h2>
          <div className="card rounded-2xl p-6">
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
              FixMerge is a PR quality gate that automatically analyzes code changes for bugs, security vulnerabilities, complexity issues, and code quality problems. It combines fast regex-based static analysis with AI-powered semantic review to catch issues that traditional linters miss.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bento rounded-xl p-4">
                <div className="mono-label mb-1">base url</div>
                <code className="text-[13px] text-[var(--accent-light)]">https://your-domain.com</code>
              </div>
              <div className="bento rounded-xl p-4">
                <div className="mono-label mb-1">format</div>
                <code className="text-[13px] text-[var(--text-primary)]">JSON</code>
              </div>
              <div className="bento rounded-xl p-4">
                <div className="mono-label mb-1">auth</div>
                <code className="text-[13px] text-[var(--text-primary)]">Bearer token</code>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-violet-400" />
            Authentication
          </h2>
          <div className="card rounded-2xl p-6 space-y-4">
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              API requests are authenticated using your API key, found in your dashboard after registration.
              Pass it as a Bearer token in the <code className="text-[var(--accent-light)]">Authorization</code> header:
            </p>
            <CodeBlock title="request header">
{`Authorization: Bearer YOUR_API_KEY`}
            </CodeBlock>
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 mt-0.5 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-[13px] text-amber-300/80">
                Keep your API key secret. Never expose it in client-side code or public repositories. Use environment variables in your CI/CD.
              </p>
            </div>
          </div>
        </section>

        {/* Webhook Setup */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-emerald-400" />
            Webhook Setup
          </h2>
          <div className="space-y-4">
            <div className="card rounded-2xl p-6 space-y-4">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                FixMerge receives PR events via GitHub webhooks. When a pull request is opened, updated, or merged, GitHub sends a payload to your webhook URL and FixMerge automatically runs the analysis.
              </p>

              <div className="space-y-3">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Configuration</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <tbody className="divide-y divide-[var(--border-default)]">
                      <tr>
                        <td className="py-2.5 pr-4 font-mono text-[var(--text-muted)] whitespace-nowrap">Payload URL</td>
                        <td className="py-2.5"><code className="text-[var(--accent-light)]">https://your-domain.com/api/webhook/github</code></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-mono text-[var(--text-muted)] whitespace-nowrap">Content type</td>
                        <td className="py-2.5"><code className="text-[var(--text-primary)]">application/json</code></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-mono text-[var(--text-muted)] whitespace-nowrap">Secret</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">Your project webhook secret (from dashboard)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 font-mono text-[var(--text-muted)] whitespace-nowrap">Events</td>
                        <td className="py-2.5 text-[var(--text-secondary)]">Pull requests only</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Supported events</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge color="green">pull_request.opened</Badge>
                  <Badge color="green">pull_request.synchronize</Badge>
                  <Badge color="green">pull_request.reopened</Badge>
                  <Badge color="accent">pull_request.closed (merged)</Badge>
                </div>
              </div>
            </div>

            <Endpoint method="POST" path="/api/webhook/github" description="Receives GitHub webhook payloads. Returns immediately with a queued status while analysis runs in the background.">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Response</h4>
                  <CodeBlock title="200 OK">
{`{
  "status": "queued",
  "analysisId": 42,
  "trigger": "opened"
}`}
                  </CodeBlock>
                </div>
              </div>
            </Endpoint>
          </div>
        </section>

        {/* REST API */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[var(--accent)]" />
            REST API
          </h2>
          <div className="space-y-4">
            {/* List analyses */}
            <Endpoint method="GET" path="/api/analyses" description="Returns a list of PR analyses for your project, sorted by most recent." auth="api key">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Query parameters</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-[var(--border-default)]">
                          <th className="text-left py-2 pr-4 font-mono text-[var(--text-muted)] font-medium">Param</th>
                          <th className="text-left py-2 pr-4 text-[var(--text-muted)] font-medium">Type</th>
                          <th className="text-left py-2 text-[var(--text-muted)] font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]">
                        <tr>
                          <td className="py-2.5 pr-4 font-mono text-[var(--accent-light)]">repo</td>
                          <td className="py-2.5 pr-4 text-[var(--text-secondary)]">string</td>
                          <td className="py-2.5 text-[var(--text-secondary)]">Filter by repository (e.g. <code>owner/repo</code>)</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-4 font-mono text-[var(--accent-light)]">limit</td>
                          <td className="py-2.5 pr-4 text-[var(--text-secondary)]">number</td>
                          <td className="py-2.5 text-[var(--text-secondary)]">Max results to return (default: 50)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Example request</h4>
                  <CodeBlock title="curl">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-domain.com/api/analyses?repo=owner/repo&limit=10`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Response</h4>
                  <CodeBlock title="200 OK">
{`[
  {
    "id": 42,
    "repo": "owner/repo",
    "prNumber": 15,
    "prTitle": "Add user authentication",
    "author": "dev-name",
    "status": "completed",
    "score": 82,
    "grade": "B",
    "totalIssues": 4,
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 1,
    "createdAt": "2026-04-04T12:00:00.000Z"
  }
]`}
                  </CodeBlock>
                </div>
              </div>
            </Endpoint>

            {/* Get analysis detail */}
            <Endpoint method="GET" path="/api/analyses/:id" description="Returns full details of a specific analysis, including all issues found." auth="api key">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Example request</h4>
                  <CodeBlock title="curl">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-domain.com/api/analyses/42`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Response</h4>
                  <CodeBlock title="200 OK">
{`{
  "id": 42,
  "repo": "owner/repo",
  "prNumber": 15,
  "prTitle": "Add user authentication",
  "score": 82,
  "grade": "B",
  "totalIssues": 4,
  "issues": [
    {
      "id": 1,
      "category": "bug",
      "severity": "high",
      "title": "Async callback inside .forEach()",
      "description": "Array.forEach() ignores the return value...",
      "filePath": "src/services/user.ts",
      "lineNumber": 45,
      "codeSnippet": "items.forEach(async (item) => {...})",
      "suggestion": "Use for...of with await instead"
    }
  ]
}`}
                  </CodeBlock>
                </div>
              </div>
            </Endpoint>

            {/* Health check */}
            <Endpoint method="GET" path="/api/health" description="Returns the API health status. No authentication required.">
              <CodeBlock title="200 OK">
{`{
  "status": "ok",
  "timestamp": "2026-04-04T12:00:00.000Z"
}`}
              </CodeBlock>
            </Endpoint>

            {/* Auth endpoints */}
            <Endpoint method="POST" path="/api/auth/register" description="Create a new company account with a project. Returns a session cookie and API credentials.">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Request body</h4>
                  <CodeBlock title="application/json">
{`{
  "name": "Acme Inc.",
  "email": "dev@acme.com",
  "password": "min-8-characters",
  "repoFullName": "acme/web-app"
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Response</h4>
                  <CodeBlock title="200 OK">
{`{
  "ok": true,
  "company": {
    "id": 1,
    "name": "Acme Inc.",
    "email": "dev@acme.com",
    "apiKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  },
  "project": {
    "id": 1,
    "name": "web-app",
    "repoFullName": "acme/web-app",
    "webhookSecret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}`}
                  </CodeBlock>
                </div>
              </div>
            </Endpoint>

            <Endpoint method="POST" path="/api/auth/login" description="Authenticate with email and password. Returns a session cookie.">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Request body</h4>
                  <CodeBlock title="application/json">
{`{
  "email": "dev@acme.com",
  "password": "your-password"
}`}
                  </CodeBlock>
                </div>
              </div>
            </Endpoint>

            <Endpoint method="GET" path="/api/auth/me" description="Returns the authenticated company profile including projects and API key." auth="session">
              <CodeBlock title="200 OK">
{`{
  "id": 1,
  "name": "Acme Inc.",
  "email": "dev@acme.com",
  "apiKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "projects": [
    {
      "id": 1,
      "name": "web-app",
      "repoFullName": "acme/web-app",
      "webhookSecret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "active": true
    }
  ]
}`}
              </CodeBlock>
            </Endpoint>
          </div>
        </section>

        {/* Issue categories */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-amber-400" />
            Issue Categories
          </h2>
          <div className="card rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bento rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>bug</Badge>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Logic errors, wrong operators, off-by-one, async mistakes, null handling, type coercion issues.
                </p>
              </div>
              <div className="bento rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color="red">security</Badge>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Hardcoded secrets, SQL injection, XSS, path traversal, unsafe deserialization, weak crypto.
                </p>
              </div>
              <div className="bento rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color="amber">complexity</Badge>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Functions too long, deeply nested logic, too many parameters, excessive cyclomatic complexity.
                </p>
              </div>
              <div className="bento rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color="violet">quality</Badge>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Linter suppressions, magic numbers, any types, console statements, untracked TODOs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Severity levels */}
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-red-400" />
            Severity Levels
          </h2>
          <div className="card rounded-2xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="text-left py-2 pr-4 font-mono text-[var(--text-muted)] font-medium">Level</th>
                    <th className="text-left py-2 pr-4 text-[var(--text-muted)] font-medium">Score impact</th>
                    <th className="text-left py-2 text-[var(--text-muted)] font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  <tr>
                    <td className="py-2.5 pr-4"><Badge color="red">critical</Badge></td>
                    <td className="py-2.5 pr-4 font-mono text-red-400">-15</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">Must fix before merge — data loss, security breach, crash</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4"><Badge color="red">high</Badge></td>
                    <td className="py-2.5 pr-4 font-mono text-rose-400">-8</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">Likely to cause issues in production — logic errors, race conditions</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4"><Badge color="amber">medium</Badge></td>
                    <td className="py-2.5 pr-4 font-mono text-amber-400">-3</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">Should be addressed — maintainability, potential edge cases</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4"><Badge color="amber">low</Badge></td>
                    <td className="py-2.5 pr-4 font-mono text-yellow-400">-1</td>
                    <td className="py-2.5 text-[var(--text-secondary)]">Nice to fix — code hygiene, best practices</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Grading */}
        <section className="pb-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-emerald-400" />
            Grading Scale
          </h2>
          <div className="card rounded-2xl p-6">
            <p className="text-[14px] text-[var(--text-secondary)] mb-4">
              Every PR starts at 100 points. Each issue deducts points based on severity. The final score maps to a letter grade:
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { grade: "A", range: "90-100", color: "text-emerald-400 bg-emerald-500/8 border-emerald-500/15" },
                { grade: "B", range: "80-89", color: "text-[var(--accent)] bg-[var(--accent-glow)] border-[var(--accent)]/15" },
                { grade: "C", range: "70-79", color: "text-amber-400 bg-amber-500/8 border-amber-500/15" },
                { grade: "D", range: "60-69", color: "text-orange-400 bg-orange-500/8 border-orange-500/15" },
                { grade: "F", range: "0-59", color: "text-red-400 bg-red-500/8 border-red-500/15" },
              ].map(({ grade, range, color }) => (
                <div key={grade} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${color}`}>
                  <span className="text-lg font-black">{grade}</span>
                  <span className="text-[12px] font-mono opacity-60">{range}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
