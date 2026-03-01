import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

// DELETE /api/admin/chat/sessions/:id — Sohbeti sil
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const chatId = safeBigInt(id);
    if (!chatId) return apiError("Geçersiz sohbet ID", 400);

    await prisma.chatSession.delete({ where: { id: chatId } });
    return Response.json(apiSuccess({ deleted: true }));
  } catch (err) {
    console.error("Chat session delete error:", err);
    return apiError("Sohbet silinemedi.", 500);
  }
}

// PATCH /api/admin/chat/sessions/:id — Arşivle/geri al
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const chatId = safeBigInt(id);
    if (!chatId) return apiError("Geçersiz sohbet ID", 400);

    const { isArchived } = await req.json();
    const session = await prisma.chatSession.update({
      where: { id: chatId },
      data: { isArchived: !!isArchived },
    });
    const serialized = JSON.parse(
      JSON.stringify(session, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
    return Response.json(apiSuccess(serialized));
  } catch (err) {
    console.error("Chat session archive error:", err);
    return apiError("Sohbet arşivlenemedi.", 500);
  }
}
