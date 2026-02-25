// ─── AI Değerlendirme Servisi ───

import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/deepseek";
import { getSystemPrompt } from "@/lib/ai-client";
import { storeEvaluationMemory } from "@/services/memory.service";

// ─── Retry Config ───

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Format candidate data for evaluation ───

function formatCandidateData(
  application: {
    fullName: string;
    email: string;
    phone: string;
    responseSummary: unknown;
  },
  departmentName: string,
  questionMap: Map<string, string>,
): string {
  const summary = application.responseSummary as Record<string, unknown> | null;
  const lines: string[] = [
    `Aday: ${application.fullName}`,
    `E-posta: ${application.email}`,
    `Telefon: ${application.phone}`,
    `Başvurulan Departman: ${departmentName}`,
    "",
    "--- Başvuru Yanıtları ---",
  ];

  if (summary) {
    for (const [key, value] of Object.entries(summary)) {
      if (key === "fullName" || key === "email" || key === "phone") continue;
      if (value === null || value === undefined) continue;

      // q_123 → question text lookup
      const qId = key.replace("q_", "");
      const questionText = questionMap.get(qId) || `Soru #${qId}`;
      const answerStr =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      lines.push(`${questionText}: ${answerStr}`);
    }
  }

  return lines.join("\n");
}

// ─── Build custom criteria prompt injection ───

function buildCriteriaPrompt(customCriteria?: EvalCriteria): string {
  if (!customCriteria || customCriteria.length === 0) return "";

  const lines = [
    "",
    "═══ KULLANICININ BELİRLEDİĞİ EK DEĞERLENDİRME KRİTERLERİ ═══",
    "Aşağıdaki kriterleri standart değerlendirme kriterlerine EK olarak uygula.",
    "Her bir kriteri ayrı ayrı değerlendir ve raporda belirt.",
    "",
  ];

  for (const c of customCriteria) {
    const weightLabel =
      c.weight === "high" ? "YÜKSEK" : c.weight === "low" ? "DÜŞÜK" : "ORTA";
    lines.push(`• ${c.label} (Ağırlık: ${weightLabel})`);
    if (c.description) lines.push(`  Açıklama: ${c.description}`);
  }

  lines.push("");
  lines.push(
    "Bu kriterleri JSON raporundaki 'customCriteriaResults' alanında ayrıca raporla:",
  );
  lines.push(
    '  "customCriteriaResults": [{"criterion":"<kriter adı>","met":true/false,"note":"<açıklama>"}]',
  );

  return lines.join("\n");
}

// ─── Evaluate a single application ───

export type EvalCriterion = {
  label: string;
  description?: string;
  weight?: "high" | "medium" | "low";
};
export type EvalCriteria = EvalCriterion[];

export async function evaluateApplication(
  applicationId: bigint,
  customCriteria?: EvalCriteria,
  sessionId?: bigint,
): Promise<void> {
  // Fetch application with department and questions
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      department: true,
      formConfig: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!application) {
    throw new Error(`Başvuru bulunamadı: ${applicationId}`);
  }

  // Build question ID → text map
  const questionMap = new Map<string, string>();
  for (const q of application.formConfig.questions) {
    questionMap.set(q.id.toString(), q.questionText);
  }

  const candidateText = formatCandidateData(
    application,
    application.department?.name ||
      application.positionTitle ||
      "Belirtilmemiş",
    questionMap,
  );

  // Always create a new evaluation record (history tracking)
  let evaluation = await prisma.evaluation.create({
    data: {
      applicationId,
      sessionId: sessionId || null,
      overallScore: 0,
      status: "pending",
      report: {},
      customCriteria: customCriteria
        ? JSON.parse(JSON.stringify(customCriteria))
        : undefined,
      evaluationLabel: customCriteria?.length
        ? `Özel Kriter (${customCriteria.map((c) => c.label).join(", ")})`
        : "Standart Değerlendirme",
    },
  });

  // Retry loop with exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs =
          RETRY_CONFIG.baseDelay *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        await delay(delayMs);
      }

      const evalPrompt = await getSystemPrompt("evaluation_system_prompt");
      const criteriaAddendum = buildCriteriaPrompt(customCriteria);
      const finalPrompt = criteriaAddendum
        ? evalPrompt + criteriaAddendum
        : evalPrompt;

      const { content: rawResponse } = await chatCompletion(
        [
          { role: "system", content: finalPrompt },
          { role: "user", content: candidateText },
        ],
        { temperature: 0.3, jsonMode: true },
      );

      // Parse JSON response
      const report = JSON.parse(rawResponse);

      // Validate required fields
      if (
        typeof report.overallScore !== "number" ||
        report.overallScore < 0 ||
        report.overallScore > 100
      ) {
        throw new Error("Geçersiz overallScore değeri.");
      }

      // Save successful evaluation
      await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: {
          overallScore: Math.round(report.overallScore),
          status: "completed",
          report: JSON.parse(JSON.stringify(report)),
          rawResponse,
          retryCount: attempt,
          evaluatedAt: new Date(),
        },
      });

      // Store evaluation in long-term memory (fire-and-forget)
      storeEvaluationMemory(
        application.fullName,
        application.email,
        application.department?.name ||
          application.positionTitle ||
          "Belirtilmemiş",
        Math.round(report.overallScore),
        report.summary || "",
        report.recommendation || "",
      ).catch(() => {});

      return; // Success
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Update retry count
      await prisma.evaluation.update({
        where: { id: evaluation.id },
        data: { retryCount: attempt + 1 },
      });
    }
  }

  // All retries failed
  await prisma.evaluation.update({
    where: { id: evaluation.id },
    data: {
      status: "failed",
      rawResponse: lastError?.message || "Bilinmeyen hata",
    },
  });
}

// ─── Trigger evaluation (fire-and-forget) ───

export function triggerEvaluation(
  applicationId: bigint,
  customCriteria?: EvalCriteria,
  sessionId?: bigint,
): void {
  evaluateApplication(applicationId, customCriteria, sessionId).catch((err) => {
    console.error(`Değerlendirme hatası (app: ${applicationId}):`, err);
  });
}
