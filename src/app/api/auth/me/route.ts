import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          repoFullName: true,
          webhookSecret: true,
          active: true,
          createdAt: true,
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: company.id,
    name: company.name,
    email: company.email,
    apiKey: company.apiKey,
    projects: company.projects,
  });
}
