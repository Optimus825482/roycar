import { describe, it, expect } from "vitest";
import {
  formatCandidateData,
  buildCriteriaPrompt,
  type EvalCriteria,
} from "./evaluation.service";

describe("formatCandidateData", () => {
  it("formats application with empty responseSummary", () => {
    const app = {
      fullName: "Ali Yılmaz",
      email: "ali@test.com",
      phone: "+905551234567",
      responseSummary: null,
    };
    const questionMap = new Map<string, string>();
    const result = formatCandidateData(app, "İnsan Kaynakları", questionMap);
    expect(result).toContain("Aday: Ali Yılmaz");
    expect(result).toContain("E-posta: ali@test.com");
    expect(result).toContain("Başvurulan Departman: İnsan Kaynakları");
    expect(result).toContain("--- Başvuru Yanıtları ---");
  });

  it("includes question-answer pairs from responseSummary with questionMap", () => {
    const app = {
      fullName: "Test",
      email: "t@t.com",
      phone: "1",
      responseSummary: {
        fullName: "Test",
        email: "t@t.com",
        q_1: "Cevap 1",
        q_2: "Cevap 2",
      },
    };
    const questionMap = new Map([
      ["1", "Deneyim yılı?"],
      ["2", "Eğitim?"],
    ]);
    const result = formatCandidateData(app, "IK", questionMap);
    expect(result).toContain("Deneyim yılı?: Cevap 1");
    expect(result).toContain("Eğitim?: Cevap 2");
    expect(result).not.toMatch(/q_1|q_2/);
  });

  it("uses Soru #id when question not in map", () => {
    const app = {
      fullName: "A",
      email: "a@a.com",
      phone: "1",
      responseSummary: { q_99: "X" },
    };
    const result = formatCandidateData(app, "Dept", new Map());
    expect(result).toContain("Soru #99: X");
  });
});

describe("buildCriteriaPrompt", () => {
  it("returns empty string for undefined or empty criteria", () => {
    expect(buildCriteriaPrompt(undefined)).toBe("");
    expect(buildCriteriaPrompt([])).toBe("");
  });

  it("returns prompt with criteria labels and weights", () => {
    const criteria: EvalCriteria = [
      { label: "Takım çalışması", weight: "high" },
      { label: "İletişim", weight: "medium", description: "Yazılı ve sözlü." },
    ];
    const result = buildCriteriaPrompt(criteria);
    expect(result).toContain("KULLANICININ BELİRLEDİĞİ EK DEĞERLENDİRME KRİTERLERİ");
    expect(result).toContain("Takım çalışması");
    expect(result).toContain("YÜKSEK");
    expect(result).toContain("İletişim");
    expect(result).toContain("ORTA");
    expect(result).toContain("Yazılı ve sözlü.");
    expect(result).toContain("customCriteriaResults");
  });

  it("uses DÜŞÜK for weight low", () => {
    const criteria: EvalCriteria = [{ label: "X", weight: "low" }];
    const result = buildCriteriaPrompt(criteria);
    expect(result).toContain("DÜŞÜK");
  });
});
