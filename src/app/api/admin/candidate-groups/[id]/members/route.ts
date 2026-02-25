import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

// POST — Gruba üye ekle (tek veya toplu)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const groupId = BigInt(id);
    const body = await req.json();

    // Tek veya toplu ekleme desteği
    const items: Array<{
      applicationId: string;
      evaluationSessionId?: string;
      evaluationId?: string;
      notes?: string;
    }> = Array.isArray(body.members) ? body.members : [body];

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const member = await prisma.candidateGroupMember.create({
          data: {
            groupId,
            applicationId: BigInt(item.applicationId),
            evaluationSessionId: item.evaluationSessionId
              ? BigInt(item.evaluationSessionId)
              : null,
            evaluationId: item.evaluationId ? BigInt(item.evaluationId) : null,
            notes: item.notes || null,
          },
        });
        results.push({
          id: member.id.toString(),
          applicationId: item.applicationId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Unique constraint violation — zaten grupta
        if (msg.includes("Unique constraint")) {
          errors.push({
            applicationId: item.applicationId,
            error: "Bu aday zaten grupta",
          });
        } else {
          errors.push({ applicationId: item.applicationId, error: msg });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { added: results, errors },
    });
  } catch (err) {
    console.error("Add group members error:", err);
    return NextResponse.json(
      { success: false, error: "Üye eklenemedi" },
      { status: 500 },
    );
  }
}

// DELETE — Gruptan üye çıkar
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const groupId = BigInt(id);
    const body = await req.json();
    const { memberId, applicationId } = body;

    if (memberId) {
      await prisma.candidateGroupMember.delete({
        where: { id: BigInt(memberId) },
      });
    } else if (applicationId) {
      await prisma.candidateGroupMember.delete({
        where: {
          groupId_applicationId: {
            groupId,
            applicationId: BigInt(applicationId),
          },
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "memberId veya applicationId gerekli" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove group member error:", err);
    return NextResponse.json(
      { success: false, error: "Üye çıkarılamadı" },
      { status: 500 },
    );
  }
}
