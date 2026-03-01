import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, safeBigInt } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

interface ValidationResult {
  isValid: boolean;
  deadEnds: { questionId: string; questionText: string }[];
  cycles: { path: string[] }[];
  orphans: { questionId: string; questionText: string }[];
  warnings: string[];
}

// POST /api/admin/forms/:id/validate — Form akışını doğrula
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const formId = safeBigInt(id);
    if (!formId) return apiError("Geçersiz form ID", 400);

    const form = await prisma.formConfig.findUnique({
      where: { id: formId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!form) return apiError("Form bulunamadı.", 404);
    if (form.mode !== "dynamic") {
      return Response.json(
        apiSuccess({
          isValid: true,
          deadEnds: [],
          cycles: [],
          orphans: [],
          warnings: [],
        }),
      );
    }

    const questions = form.questions;
    if (questions.length === 0) {
      return Response.json(
        apiSuccess({
          isValid: true,
          deadEnds: [],
          cycles: [],
          orphans: [],
          warnings: ["Form boş."],
        }),
      );
    }

    const questionIds = questions.map((q) => q.id);
    const rules = await prisma.branchingRule.findMany({
      where: { sourceQuestionId: { in: questionIds } },
    });

    // Graph oluştur — adjacency list
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const q of questions) {
      const qId = q.id.toString();
      adj.set(qId, []);
      inDegree.set(qId, 0);
    }

    // Statik sıralama kenarları (fallback)
    for (let i = 0; i < questions.length - 1; i++) {
      const from = questions[i].id.toString();
      const to = questions[i + 1].id.toString();
      adj.get(from)!.push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Dallanma kuralı kenarları
    for (const rule of rules) {
      const from = rule.sourceQuestionId.toString();
      const to = rule.targetQuestionId.toString();
      if (!adj.get(from)!.includes(to)) {
        adj.get(from)!.push(to);
        inDegree.set(to, (inDegree.get(to) || 0) + 1);
      }
    }

    const result: ValidationResult = {
      isValid: true,
      deadEnds: [],
      cycles: [],
      orphans: [],
      warnings: [],
    };

    // Dead-end tespiti: çıkışı olmayan ve son soru olmayan düğümler
    const lastQId = questions[questions.length - 1].id.toString();
    for (const q of questions) {
      const qId = q.id.toString();
      if (qId !== lastQId && (adj.get(qId)?.length || 0) === 0) {
        result.deadEnds.push({ questionId: qId, questionText: q.questionText });
      }
    }

    // Orphan tespiti: ilk soru hariç, hiçbir yerden ulaşılamayan sorular
    const firstQId = questions[0].id.toString();
    for (const q of questions) {
      const qId = q.id.toString();
      if (qId !== firstQId && (inDegree.get(qId) || 0) === 0) {
        result.orphans.push({ questionId: qId, questionText: q.questionText });
        result.warnings.push(
          `"${q.questionText}" sorusuna hiçbir yoldan ulaşılamıyor.`,
        );
      }
    }

    // Döngü tespiti (DFS)
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(node: string, path: string[]): boolean {
      visited.add(node);
      recStack.add(node);
      for (const neighbor of adj.get(node) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path, neighbor])) return true;
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          result.cycles.push({ path: path.slice(cycleStart) });
          return true;
        }
      }
      recStack.delete(node);
      return false;
    }

    for (const q of questions) {
      const qId = q.id.toString();
      if (!visited.has(qId)) {
        dfs(qId, [qId]);
      }
    }

    result.isValid = result.deadEnds.length === 0 && result.cycles.length === 0;

    return Response.json(apiSuccess(result));
  } catch (err) {
    console.error("Form doğrulama hatası:", err);
    return apiError("Form doğrulanamadı.", 500);
  }
}
