import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// POST /api/admin/chat/sessions/bulk — Toplu silme veya arşivleme
export async function POST(req: NextRequest) {
  try {
    const { ids, action } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("Geçersiz oturum listesi.");
    }

    const bigIds = ids.map((id: string) => BigInt(id));

    if (action === "delete") {
      await prisma.chatSession.deleteMany({
        where: { id: { in: bigIds } },
      });
      return Response.json(apiSuccess({ deleted: ids.length }));
    }

    if (action === "archive") {
      await prisma.chatSession.updateMany({
        where: { id: { in: bigIds } },
        data: { isArchived: true },
      });
      return Response.json(apiSuccess({ archived: ids.length }));
    }

    if (action === "unarchive") {
      await prisma.chatSession.updateMany({
        where: { id: { in: bigIds } },
        data: { isArchived: false },
      });
      return Response.json(apiSuccess({ unarchived: ids.length }));
    }

    return apiError("Geçersiz işlem. (delete | archive | unarchive)");
  } catch (err) {
    console.error("Bulk session action error:", err);
    return apiError("Toplu işlem başarısız.", 500);
  }
}
