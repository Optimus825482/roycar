import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";
import { auth } from "@/lib/auth";
import {
  triggerEvaluation,
  type EvalCriteria,
} from "@/services/evaluation.service";

type Ctx = { params: Promise<{ id: string }> };

// ─── GET — Oturumdaki adaylar + değerlendirme + grup üyelik bilgisi ───

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sessionId = safeBigInt(id);
    if (!sessionId) return apiError("Geçersiz oturum ID", 400);

    const evaluations = await prisma.evaluation.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            applicationNo: true,
            positionTitle: true,
            department: { select: { name: true } },
            submittedAt: true,
            status: true,
            responseSummary: true,
            groupMembers: {
              include: {
                group: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const candidates = evaluations.map((e) => ({
      evaluationId: e.id.toString(),
      applicationId: e.applicationId.toString(),
      fullName: e.application.fullName,
      email: e.application.email,
      phone: e.application.phone,
      applicationNo: e.application.applicationNo,
      positionTitle: e.application.positionTitle,
      department: e.application.department?.name ?? "—",
      submittedAt: e.application.submittedAt.toISOString(),
      applicationStatus: e.application.status,
      responseSummary: e.application.responseSummary,
      // Değerlendirme bilgileri
      overallScore: e.overallScore,
      evaluationStatus: e.status,
      report: e.report,
      evaluatedAt: e.evaluatedAt?.toISOString() ?? null,
      customCriteria: e.customCriteria,
      evaluationLabel: e.evaluationLabel,
      manualNote: e.manualNote,
      finalDecision: e.finalDecision,
      // Grup üyelikleri
      groups: e.application.groupMembers.map((gm) => ({
        groupId: gm.group.id.toString(),
        groupName: gm.group.name,
        membershipId: gm.id.toString(),
      })),
    }));

    return Response.json(apiSuccess(candidates));
  } catch (err) {
    console.error("Session candidates error:", err);
    return apiError("Oturum adayları yüklenemedi", 500);
  }
}

// ─── POST — Oturuma aday ekle (opsiyonel değerlendirme tetikle) ───

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const sessionId = safeBigInt(id);
    if (!sessionId) return apiError("Geçersiz oturum ID", 400);

    const session = await auth();
    const createdById = session?.user?.id ? BigInt(session.user.id) : undefined;

    const { applicationIds, customCriteria, skipEvaluation } = await req.json();

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return apiError("applicationIds dizisi gereklidir", 400);
    }

    const criteria: EvalCriteria | undefined =
      Array.isArray(customCriteria) && customCriteria.length > 0
        ? customCriteria
        : undefined;

    let queued = 0;

    if (skipEvaluation) {
      // Sadece pending evaluation kaydı oluştur, AI değerlendirme başlatma
      const appBigIds = applicationIds.map((id: string) => BigInt(id));

      // Batch: mevcut pending kayıtları tek sorguda bul
      const existingEvals = await prisma.evaluation.findMany({
        where: {
          sessionId,
          status: "pending",
          applicationId: { in: appBigIds },
        },
        select: { applicationId: true },
      });
      const existingSet = new Set(
        existingEvals.map((e) => e.applicationId.toString()),
      );

      // Yeni oluşturulacakları filtrele
      const toCreate = appBigIds.filter(
        (id) => !existingSet.has(id.toString()),
      );
      const alreadyExisting = appBigIds.length - toCreate.length;

      if (toCreate.length > 0) {
        await prisma.evaluation.createMany({
          data: toCreate.map((appId) => ({
            applicationId: appId,
            sessionId,
            createdById: createdById || null,
            overallScore: 0,
            status: "pending",
            report: {},
            evaluationLabel: "Standart Değerlendirme",
          })),
          skipDuplicates: true,
        });
      }

      queued = toCreate.length + alreadyExisting;
    } else {
      // Değerlendirmeyi başlat — mevcut pending kayıtları sil ve yeniden oluştur
      for (const appId of applicationIds) {
        // Mevcut pending evaluation'ı sil (skipEvaluation ile oluşturulmuş olabilir)
        await prisma.evaluation.deleteMany({
          where: { applicationId: BigInt(appId), sessionId, status: "pending" },
        });
        triggerEvaluation(BigInt(appId), criteria, sessionId, createdById);
        queued++;
      }
    }

    return Response.json(
      apiSuccess({
        queued,
        message: skipEvaluation
          ? `${queued} aday oturuma eklendi.`
          : `${queued} aday değerlendirmeye alındı.`,
      }),
    );
  } catch (err) {
    console.error("Session add candidates error:", err);
    return apiError("Adaylar oturuma eklenemedi", 500);
  }
}
