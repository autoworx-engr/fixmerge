import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, repoFullName } = body as {
      name: string;
      email: string;
      password: string;
      repoFullName: string;
    };

    if (!name || !email || !password || !repoFullName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedRepo = repoFullName
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");

    if (!normalizedRepo.includes("/")) {
      return NextResponse.json(
        { error: "Repository must be in owner/repo format" },
        { status: 400 }
      );
    }

    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingProject = await prisma.project.findUnique({
      where: { repoFullName: normalizedRepo },
    });
    if (existingProject) {
      return NextResponse.json(
        { error: "This repository is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const company = await prisma.company.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        projects: {
          create: {
            name: normalizedRepo.split("/")[1] || normalizedRepo,
            repoFullName: normalizedRepo,
          },
        },
      },
      include: { projects: true },
    });

    const token = await signToken({
      companyId: company.id,
      email: company.email,
      name: company.name,
    });

    const response = NextResponse.json({
      ok: true,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        apiKey: company.apiKey,
      },
      project: {
        id: company.projects[0].id,
        name: company.projects[0].name,
        repoFullName: company.projects[0].repoFullName,
        webhookSecret: company.projects[0].webhookSecret,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
