import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — Tüm oturumları listele
export async function GET() {
  try {
    const sessions = await prisma.evaluationSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { evaluations: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });

    const data = sessions.map((s) => ({
      id: s.id.toString(),
      label: s.label,
      description: s.description,
      criteria: s.criteria,
      status: s.status,
      evaluationCount: s._count.evaluations,
      createdBy: s.createdBy
        ? {
            id: s.createdBy.id.toString(),
            fullName: s.createdBy.fullName,
            username: s.createdBy.username,
          }
        : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Evaluation sessions list error:", err);
    return NextResponse.json(
      { success: false, error: "Oturumlar yüklenemedi" },
      { status: 500 },
    );
  }
}

// POST — Yeni oturum oluştur
export async function POST(req: NextRequest) {
  try {
    const authSession = await auth();
    const userId = authSession?.user?.id ? BigInt(authSession.user.id) : null;

    const body = await req.json();
    const { label, description, criteria } = body;

    const session = await prisma.evaluationSession.create({
      data: {
        label: label || null,
        description: description || null,
        criteria: criteria || [],
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: session.id.toString(),
        label: session.label,
        description: session.description,
        criteria: session.criteria,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Evaluation session create error:", err);
    return NextResponse.json(
      { success: false, error: "Oturum oluşturulamadı" },
      { status: 500 },
    );
  }
}
