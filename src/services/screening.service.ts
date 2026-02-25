// ─── Ön Eleme (Screening) Servisi ───

import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/deepseek";
import { getSystemPrompt } from "@/lib/ai-client";

// ─── Rule Types ───

interface ScreeningRule {
  questionId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in"
    | "is_empty"
    | "is_not_empty";
  value: string | string[];
  weight: number; // 0-100
}

interface RuleResult {
  questionId: string;
  questionText?: string;
  passed: boolean;
  score: number;
  reason: string;
}

interface ScreeningOutput {
  passed: boolean;
  score: number;
  details: {
    ruleResults: RuleResult[];
    aiAnalysis?: string;
    aiScore?: number;
  };
}

// ─── Evaluate a single rule against answer ───

function evaluateRule(
  rule: ScreeningRule,
  answer: unknown,
): { passed: boolean; reason: string } {
  const strAnswer = answer == null ? "" : String(answer).trim().toLowerCase();
  const ruleValue = Array.isArray(rule.value)
    ? rule.value.map((v) => v.toLowerCase())
    : String(rule.value).trim().toLowerCase();

  switch (rule.operator) {
    case "equals":
      return {
        passed: strAnswer === ruleValue,
        reason:
          strAnswer === ruleValue
            ? "Eşleşti"
            : `Beklenen: "${rule.value}", Verilen: "${answer ?? ""}"`,
      };
    case "not_equals":
      return {
        passed: strAnswer !== ruleValue,
        reason:
          strAnswer !== ruleValue
            ? "Eşleşmedi (beklenen)"
            : `İstenmeyen değer: "${answer}"`,
      };

    case "contains":
      return {
        passed: strAnswer.includes(ruleValue as string),
        reason: strAnswer.includes(ruleValue as string)
          ? "İçeriyor"
          : `"${rule.value}" bulunamadı`,
      };

    case "not_contains":
      return {
        passed: !strAnswer.includes(ruleValue as string),
        reason: !strAnswer.includes(ruleValue as string)
          ? "İçermiyor (beklenen)"
          : `İstenmeyen içerik bulundu`,
      };

    case "greater_than": {
      const num = parseFloat(strAnswer);
      const threshold = parseFloat(ruleValue as string);
      const pass = !isNaN(num) && num > threshold;
      return {
        passed: pass,
        reason: pass
          ? `${num} > ${threshold}`
          : `${num || "N/A"} <= ${threshold}`,
      };
    }

    case "less_than": {
      const num = parseFloat(strAnswer);
      const threshold = parseFloat(ruleValue as string);
      const pass = !isNaN(num) && num < threshold;
      return {
        passed: pass,
        reason: pass
          ? `${num} < ${threshold}`
          : `${num || "N/A"} >= ${threshold}`,
      };
    }

    case "in":
      return {
        passed: Array.isArray(ruleValue) && ruleValue.includes(strAnswer),
        reason:
          Array.isArray(ruleValue) && ruleValue.includes(strAnswer)
            ? "Listede bulundu"
            : "Listede bulunamadı",
      };

    case "not_in":
      return {
        passed: Array.isArray(ruleValue) && !ruleValue.includes(strAnswer),
        reason:
          Array.isArray(ruleValue) && !ruleValue.includes(strAnswer)
            ? "Listede yok (beklenen)"
            : "İstenmeyen değer listede",
      };

    case "is_empty":
      return {
        passed: strAnswer === "",
        reason: strAnswer === "" ? "Boş (beklenen)" : "Dolu",
      };

    case "is_not_empty":
      return {
        passed: strAnswer !== "",
        reason: strAnswer !== "" ? "Dolu (beklenen)" : "Boş",
      };

    default:
      return { passed: false, reason: `Bilinmeyen operatör: ${rule.operator}` };
  }
}

// ─── Run rule-based screening ───

function runRuleBasedScreening(
  rules: ScreeningRule[],
  responseSummary: Record<string, unknown>,
  questionMap: Map<string, string>,
): { ruleResults: RuleResult[]; totalScore: number } {
  if (rules.length === 0) return { ruleResults: [], totalScore: 0 };

  const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
  const ruleResults: RuleResult[] = [];
  let earnedWeight = 0;

  for (const rule of rules) {
    const answerKey = `q_${rule.questionId}`;
    const answer = responseSummary[answerKey];
    const { passed, reason } = evaluateRule(rule, answer);

    if (passed) earnedWeight += rule.weight;

    ruleResults.push({
      questionId: rule.questionId,
      questionText:
        questionMap.get(rule.questionId) || `Soru #${rule.questionId}`,
      passed,
      score: passed ? rule.weight : 0,
      reason,
    });
  }

  const totalScore =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  return { ruleResults, totalScore };
}

// ─── Run AI-assisted screening ───

async function runAiScreening(
  aiPrompt: string,
  candidateText: string,
): Promise<{ aiScore: number; aiAnalysis: string }> {
  const screeningPrompt = await getSystemPrompt("screening_system_prompt");
  const finalPrompt = aiPrompt
    ? `${screeningPrompt}\n\n## Ek Kriterler\n${aiPrompt}`
    : screeningPrompt;

  const { content } = await chatCompletion(
    [
      { role: "system", content: finalPrompt },
      { role: "user", content: candidateText },
    ],
    { temperature: 0.3, jsonMode: true },
  );

  try {
    const result = JSON.parse(content);
    return {
      aiScore:
        typeof result.score === "number"
          ? Math.min(100, Math.max(0, Math.round(result.score)))
          : 50,
      aiAnalysis: result.analysis || result.summary || content,
    };
  } catch {
    return { aiScore: 50, aiAnalysis: content };
  }
}

// ─── Format candidate for AI ───

function formatCandidateForScreening(
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
    `Departman: ${departmentName}`,
    "",
    "--- Yanıtlar ---",
  ];

  if (summary) {
    for (const [key, value] of Object.entries(summary)) {
      if (["fullName", "email", "phone"].includes(key)) continue;
      if (value == null) continue;
      const qId = key.replace("q_", "");
      const qText = questionMap.get(qId) || `Soru #${qId}`;
      lines.push(
        `${qText}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
      );
    }
  }

  return lines.join("\n");
}

// ─── Main: Evaluate screening for an application ───

export async function evaluateScreening(
  applicationId: bigint,
  criteriaId: bigint,
): Promise<ScreeningOutput> {
  const [application, criteria] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        department: true,
        formConfig: {
          include: { questions: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.screeningCriteria.findUnique({ where: { id: criteriaId } }),
  ]);

  if (!application) throw new Error(`Başvuru bulunamadı: ${applicationId}`);
  if (!criteria) throw new Error(`Kriter bulunamadı: ${criteriaId}`);

  // Build question map
  const questionMap = new Map<string, string>();
  for (const q of application.formConfig.questions) {
    questionMap.set(q.id.toString(), q.questionText);
  }

  const responseSummary =
    (application.responseSummary as Record<string, unknown>) || {};
  const rules = (criteria.criteriaRules as unknown as ScreeningRule[]) || [];

  // Rule-based evaluation
  const { ruleResults, totalScore: ruleScore } = runRuleBasedScreening(
    rules,
    responseSummary,
    questionMap,
  );

  let finalScore = ruleScore;
  let aiAnalysis: string | undefined;
  let aiScore: number | undefined;

  // AI-assisted evaluation
  if (criteria.useAiAssist) {
    const candidateText = formatCandidateForScreening(
      application,
      application.department?.name ||
        application.positionTitle ||
        "Belirtilmemiş",
      questionMap,
    );

    const aiResult = await runAiScreening(
      criteria.aiPrompt || "",
      candidateText,
    );
    aiScore = aiResult.aiScore;
    aiAnalysis = aiResult.aiAnalysis;

    // Blend scores: if rules exist, 60% rules + 40% AI; if no rules, 100% AI
    finalScore =
      rules.length > 0 ? Math.round(ruleScore * 0.6 + aiScore * 0.4) : aiScore;
  }

  const passed = finalScore >= criteria.passThreshold;

  const output: ScreeningOutput = {
    passed,
    score: finalScore,
    details: { ruleResults, aiAnalysis, aiScore },
  };

  // Upsert result
  await prisma.screeningResult.upsert({
    where: {
      applicationId_criteriaId: { applicationId, criteriaId },
    },
    create: {
      applicationId,
      criteriaId,
      passed,
      score: finalScore,
      details: JSON.parse(JSON.stringify(output.details)),
    },
    update: {
      passed,
      score: finalScore,
      details: JSON.parse(JSON.stringify(output.details)),
      screenedAt: new Date(),
    },
  });

  return output;
}

// ─── Run all active criteria for an application ───

export async function runAutoScreening(applicationId: bigint) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { departmentId: true, formConfigId: true },
  });

  if (!application) throw new Error(`Başvuru bulunamadı: ${applicationId}`);

  // Find matching criteria (same department or form, or global)
  const criteriaList = await prisma.screeningCriteria.findMany({
    where: {
      isActive: true,
      OR: [
        { departmentId: application.departmentId },
        { formConfigId: application.formConfigId },
        { departmentId: null, formConfigId: null },
      ],
    },
  });

  const results = [];
  for (const criteria of criteriaList) {
    const result = await evaluateScreening(applicationId, criteria.id);
    results.push({
      criteriaId: criteria.id.toString(),
      criteriaName: criteria.name,
      ...result,
    });
  }

  return results;
}

// ─── Get screening results for an application ───

export async function getScreeningResults(applicationId: bigint) {
  return prisma.screeningResult.findMany({
    where: { applicationId },
    include: { criteria: { select: { name: true, passThreshold: true } } },
    orderBy: { screenedAt: "desc" },
  });
}
