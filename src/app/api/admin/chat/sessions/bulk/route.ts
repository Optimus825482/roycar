import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

// POST /api/admin/chat/sessions/bulk — Toplu silme veya arşivleme
export async function POST(req: NextRequest) {
  try {
    const { ids, action } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError("Geçersiz oturum listesi.");
    }

    const bigIds = ids.map((id: string) => safeBigInt(id));
    if (bigIds.some((id) => id === null)) {
      return apiError("Geçersiz oturum ID formatı.", 400);
    }
    const validIds = bigIds as bigint[];

    if (action === "delete") {
      await prisma.chatSession.deleteMany({
        where: { id: { in: validIds } },
      });
      return Response.json(apiSuccess({ deleted: ids.length }));
    }

    if (action === "archive") {
      await prisma.chatSession.updateMany({
        where: { id: { in: validIds } },
        data: { isArchived: true },
      });
      return Response.json(apiSuccess({ archived: ids.length }));
    }

    if (action === "unarchive") {
      await prisma.chatSession.updateMany({
        where: { id: { in: validIds } },
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
