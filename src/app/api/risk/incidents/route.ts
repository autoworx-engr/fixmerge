import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  RISK_MAX_BODY_BYTES,
  upsertProductionIncident,
  verifyRiskWebhookSignature,
  parseRepoFullName,
  parseExternalId,
  parseTitle,
  parseSource,
  parseEventCount,
  parseOccurredAt,
  parsePathsField,
} from "@/lib/risk";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Ingest a production signal (error spike, custom monitor, etc.).
 *
 * Auth (either):
 * - `Authorization: Bearer <company.apiKey>` and `repoFullName` must belong to that company.
 * - `X-FixMerge-Signature: sha256=<hex>` HMAC of raw body with `RISK_WEBHOOK_SECRET`.
 *
 * If `RISK_WEBHOOK_SECRET` is unset, only Bearer auth is accepted.
 */
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw.length > RISK_MAX_BODY_BYTES) {
      return jsonError("Payload too large", 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    if (!body || typeof body !== "object") {
      return jsonError("Body must be a JSON object", 400);
    }

    const o = body as Record<string, unknown>;

    const repoFullName = parseRepoFullName(o.repoFullName);
    if (!repoFullName) {
      return jsonError(
        "Invalid or missing repoFullName (expected owner/repo)",
        400
      );
    }

    const externalId = parseExternalId(o.externalId);
    if (!externalId) {
      return jsonError("Invalid or missing externalId", 400);
    }

    const authHeader = request.headers.get("authorization") || "";
    const bearer =
      authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    const sig =
      request.headers.get("x-fixmerge-signature") ||
      request.headers.get("x-hub-signature-256") ||
      "";

    const hasSecret = Boolean(process.env.RISK_WEBHOOK_SECRET);
    let projectId: number | null = null;

    if (bearer) {
      const company = await prisma.company.findUnique({
        where: { apiKey: bearer },
        select: { id: true },
      });
      if (!company) {
        return jsonError("Invalid API key", 401);
      }
      const project = await prisma.project.findFirst({
        where: { repoFullName, companyId: company.id, active: true },
        select: { id: true },
      });
      if (!project) {
        return jsonError(
          "Repository is not registered for this account",
          403
        );
      }
      projectId = project.id;
    } else if (hasSecret && verifyRiskWebhookSignature(raw, sig)) {
      const project = await prisma.project.findFirst({
        where: { repoFullName, active: true },
        select: { id: true },
      });
      if (!project) {
        return jsonError(
          "Unknown repository — register the project first",
          404
        );
      }
      projectId = project.id;
    } else {
      if (!hasSecret) {
        return jsonError(
          "Unauthorized — send Authorization: Bearer <apiKey> or configure RISK_WEBHOOK_SECRET with X-FixMerge-Signature",
          401
        );
      }
      return jsonError("Unauthorized — invalid or missing signature", 401);
    }

    const title = parseTitle(o.title);
    const source = parseSource(o.source);
    const eventCount = parseEventCount(o.eventCount);
    const occurredAt = parseOccurredAt(o.occurredAt);
    const paths = parsePathsField(o.paths);

    const row = await upsertProductionIncident({
      repoFullName,
      projectId,
      externalId,
      source,
      title,
      paths,
      eventCount,
      occurredAt,
    });

    return NextResponse.json({
      ok: true,
      id: row.id,
      eventCount: row.eventCount,
      pathsStored: row.paths.length,
    });
  } catch (err) {
    console.error("Risk ingest error:", err);
    return jsonError(
      err instanceof Error ? err.message : "Internal error",
      500
    );
  }
}
