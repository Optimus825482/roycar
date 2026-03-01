import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, safeBigInt } from "@/lib/utils";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/import/logs/:id — Aktarımı geri al ve sil
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Yetkisiz erişim.", 401);
    }

    const permissions = (
      session.user as { permissions?: Record<string, boolean> }
    ).permissions;
    if (!permissions?.import_delete && !permissions?.data_import) {
      return apiError("Bu işlem için yetkiniz bulunmamaktadır.", 403);
    }

    const { id } = await params;
    const logId = safeBigInt(id);
    if (!logId) return apiError("Geçersiz aktarım ID", 400);

    // Import log'u kontrol et
    const importLog = await prisma.importLog.findUnique({
      where: { id: logId },
      include: { applications: { select: { id: true } } },
    });

    if (!importLog) {
      return apiError("Aktarım kaydı bulunamadı.", 404);
    }

    const applicationIds = importLog.applications.map((a) => a.id);
    let deletedApplications = 0;

    if (applicationIds.length > 0) {
      // Cascade: önce ilişkili kayıtları sil
      await prisma.$transaction(async (tx) => {
        // ApplicationFieldValue
        await tx.applicationFieldValue.deleteMany({
          where: { applicationId: { in: applicationIds } },
        });

        // ApplicationResponse
        await tx.applicationResponse.deleteMany({
          where: { applicationId: { in: applicationIds } },
        });

        // ScreeningResult
        await tx.screeningResult.deleteMany({
          where: { applicationId: { in: applicationIds } },
        });

        // Evaluation
        await tx.evaluation.deleteMany({
          where: { applicationId: { in: applicationIds } },
        });

        // Applications
        const result = await tx.application.deleteMany({
          where: { id: { in: applicationIds } },
        });
        deletedApplications = result.count;

        // ImportLog
        await tx.importLog.delete({ where: { id: logId } });
      });
    } else {
      // Başvuru yoksa sadece log'u sil
      await prisma.importLog.delete({ where: { id: logId } });
    }

    return Response.json({
      success: true,
      message: `Aktarım geri alındı. ${deletedApplications} başvuru silindi.`,
      deletedApplications,
    });
  } catch (err) {
    console.error("Import rollback error:", err);
    return apiError("Aktarım geri alınırken hata oluştu.", 500);
  }
}
