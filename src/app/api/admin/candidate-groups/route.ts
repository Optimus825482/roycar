import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — Tüm grupları listele
export async function GET() {
  try {
    const groups = await prisma.candidateGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
      },
    });

    const data = groups.map((g) => ({
      id: g.id.toString(),
      name: g.name,
      description: g.description,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Candidate groups list error:", err);
    return NextResponse.json(
      { success: false, error: "Gruplar yüklenemedi" },
      { status: 500 },
    );
  }
}

// POST — Yeni grup oluştur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Grup adı zorunludur" },
        { status: 400 },
      );
    }

    const group = await prisma.candidateGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: group.id.toString(),
        name: group.name,
        description: group.description,
        createdAt: group.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Candidate group create error:", err);
    return NextResponse.json(
      { success: false, error: "Grup oluşturulamadı" },
      { status: 500 },
    );
  }
}
