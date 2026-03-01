import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

// POST — Gruba üye ekle (tek veya toplu)
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const groupId = safeBigInt(id);
    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Geçersiz grup ID" },
        { status: 400 },
      );
    }
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

    // Use createMany for batch insert, then handle unique constraint errors individually
    const createData = items.map((item) => ({
      groupId,
      applicationId: BigInt(item.applicationId),
      evaluationSessionId: item.evaluationSessionId
        ? BigInt(item.evaluationSessionId)
        : null,
      evaluationId: item.evaluationId ? BigInt(item.evaluationId) : null,
      notes: item.notes || null,
    }));

    // Try batch insert first, fall back to individual on conflict
    try {
      const batchResult = await prisma.candidateGroupMember.createMany({
        data: createData,
        skipDuplicates: true,
      });
      // All non-duplicate items were inserted
      for (const item of items) {
        results.push({ id: "batch", applicationId: item.applicationId });
      }
      if (batchResult.count < items.length) {
        const skipped = items.length - batchResult.count;
        for (let i = 0; i < skipped; i++) {
          errors.push({
            applicationId: "unknown",
            error: "Bu aday zaten grupta",
          });
        }
      }
    } catch {
      // Fallback to individual inserts if batch fails
      for (const item of items) {
        try {
          const member = await prisma.candidateGroupMember.create({
            data: {
              groupId,
              applicationId: BigInt(item.applicationId),
              evaluationSessionId: item.evaluationSessionId
                ? BigInt(item.evaluationSessionId)
                : null,
              evaluationId: item.evaluationId
                ? BigInt(item.evaluationId)
                : null,
              notes: item.notes || null,
            },
          });
          results.push({
            id: member.id.toString(),
            applicationId: item.applicationId,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
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
    const groupId = safeBigInt(id);
    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Geçersiz grup ID" },
        { status: 400 },
      );
    }
    const body = await req.json();
    const { memberId, applicationId } = body;

    if (memberId) {
      const mid = safeBigInt(String(memberId));
      if (!mid) {
        return NextResponse.json(
          { success: false, error: "Geçersiz üye ID" },
          { status: 400 },
        );
      }
      await prisma.candidateGroupMember.delete({
        where: { id: mid },
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
