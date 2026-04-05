import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseOwnerRepo } from "@/lib/repo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = parseInt((await params).id, 10);
  if (!Number.isFinite(projectId) || projectId < 1) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  let body: { repoFullName?: string };
  try {
    body = (await request.json()) as { repoFullName?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newRepo = parseOwnerRepo(body.repoFullName ?? "");
  if (!newRepo) {
    return NextResponse.json(
      { error: "Repository must be in owner/repo format (e.g. acme/web-app)" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: session.companyId },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (newRepo === project.repoFullName) {
    return NextResponse.json({
      ok: true,
      project: {
        id: project.id,
        repoFullName: project.repoFullName,
        name: project.name,
      },
    });
  }

  const taken = await prisma.project.findFirst({
    where: {
      repoFullName: newRepo,
      id: { not: projectId },
    },
  });
  if (taken) {
    return NextResponse.json(
      { error: "That repository is already registered to another account" },
      { status: 409 }
    );
  }

  const oldRepo = project.repoFullName;
  const shortName = newRepo.split("/")[1] || newRepo;

  try {
    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: {
          repoFullName: newRepo,
          name: shortName,
        },
      }),
      prisma.pRAnalysis.updateMany({
        where: { repoFullName: oldRepo },
        data: { repoFullName: newRepo },
      }),
      prisma.productionIncident.updateMany({
        where: { repoFullName: oldRepo },
        data: { repoFullName: newRepo },
      }),
    ]);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That repository identifier is already in use" },
        { status: 409 }
      );
    }
    console.error("Project repo update error:", err);
    return NextResponse.json(
      { error: "Could not update repository" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    project: {
      id: projectId,
      repoFullName: newRepo,
      name: shortName,
    },
  });
}
