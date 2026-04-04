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
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && !verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = request.headers.get("x-github-event") || "";
    if (event === "ping") {
      return NextResponse.json({ status: "pong" });
    }
    if (event !== "pull_request") {
      return NextResponse.json({ status: "ignored", event });
    }

    const payload = JSON.parse(body);
    const action: string = payload.action;
    const pr = payload.pull_request;

    const isMerge = action === "closed" && pr?.merged === true;
    const isReviewTrigger = TRIGGER_ACTIONS.has(action);

    if (!isMerge && !isReviewTrigger) {
      return NextResponse.json({ status: "ignored", action });
    }

    const repo: string = payload.repository.full_name;
    const prNumber: number = pr.number;
    const headSha: string = pr.head.sha;
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
      },
    });

    // after() keeps the serverless function alive after the response is sent.
    // Without this, Vercel kills the function and the analysis never completes.
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
