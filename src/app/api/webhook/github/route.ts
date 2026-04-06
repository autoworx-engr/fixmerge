import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/github";
import { runAnalysis } from "@/lib/engine";

const TRIGGER_ACTIONS = new Set(["opened", "synchronize", "reopened"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const repoFullName =
      typeof payload.repository === "object" &&
      payload.repository !== null &&
      typeof (payload.repository as { full_name?: unknown }).full_name === "string"
        ? (payload.repository as { full_name: string }).full_name
        : null;

    const project = repoFullName
      ? await prisma.project.findUnique({ where: { repoFullName } })
      : null;

    // Per-project secret (dashboard) for multi-tenant; optional global env fallback for unregistered repos.
    const signingSecret =
      project?.webhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET ?? null;
    if (!verifyWebhookSignature(body, signature, signingSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = request.headers.get("x-github-event") || "";
    if (event === "ping") {
      return NextResponse.json({ status: "pong" });
    }
    if (event !== "pull_request") {
      return NextResponse.json({ status: "ignored", event });
    }

    const prPayload = payload as {
      action?: string;
      pull_request?: {
        number: number;
        title?: string;
        html_url?: string;
        merged?: boolean;
        merged_at?: string | null;
        user?: { login?: string };
        head?: { sha: string; ref?: string };
        base?: { ref?: string };
      };
      repository?: { full_name?: string };
    };

    const action = prPayload.action ?? "";
    const pr = prPayload.pull_request;
    if (!repoFullName || !pr?.number || !pr.head?.sha) {
      return NextResponse.json({ error: "Invalid pull_request payload" }, { status: 400 });
    }

    const isMerge = action === "closed" && pr.merged === true;
    const isReviewTrigger = TRIGGER_ACTIONS.has(action);

    if (!isMerge && !isReviewTrigger) {
      return NextResponse.json({ status: "ignored", action });
    }

    const repo = repoFullName;
    const prNumber = pr.number;
    const headSha = pr.head.sha;
    const trigger = isMerge ? "merged" : action;

    if (action === "synchronize") {
      await prisma.pRAnalysis.deleteMany({
        where: { repoFullName: repo, prNumber, trigger: { not: "merged" } },
      });
    }

    const analysis = await prisma.pRAnalysis.create({
      data: {
        repoFullName: repo,
        prNumber,
        prTitle: pr.title || "",
        prUrl: pr.html_url || "",
        author: pr.user?.login || "",
        trigger,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        baseBranch: pr.base?.ref || "",
        headBranch: pr.head?.ref || "",
        status: "pending",
        projectId: project?.id ?? null,
      },
    });

    after(async () => {
      try {
        await runAnalysis(analysis.id, repo, prNumber, headSha);
      } catch (err) {
        console.error("Background analysis failed:", err);
      }
    });

    return NextResponse.json({
      status: "queued",
      analysisId: analysis.id,
      trigger,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
