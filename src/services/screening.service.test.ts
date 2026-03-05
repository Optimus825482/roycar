import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  formatCandidateForScreening,
} from "./screening.service";

describe("screening.service", () => {
  describe("evaluateRule", () => {
    it("equals: passes when answer matches", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "equals", value: "evet", weight: 50 },
        "evet"
      );
      expect(r.passed).toBe(true);
      expect(r.reason).toMatch(/Eşleşti/);
    });

    it("equals: fails when answer does not match", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "equals", value: "evet", weight: 50 },
        "hayır"
      );
      expect(r.passed).toBe(false);
    });

    it("not_equals: passes when answer differs", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "not_equals", value: "evet", weight: 50 },
        "hayır"
      );
      expect(r.passed).toBe(true);
    });

    it("contains: passes when answer contains value", () => {
      const r = evaluateRule(
        {
          questionId: "q1",
          operator: "contains",
          value: "javascript",
          weight: 50,
        },
        "I know javascript and react"
      );
      expect(r.passed).toBe(true);
    });

    it("greater_than: passes when numeric answer > threshold", () => {
      const r = evaluateRule(
        {
          questionId: "q1",
          operator: "greater_than",
          value: "3",
          weight: 50,
        },
        "5"
      );
      expect(r.passed).toBe(true);
    });

    it("less_than: passes when numeric answer < threshold", () => {
      const r = evaluateRule(
        {
          questionId: "q1",
          operator: "less_than",
          value: "10",
          weight: 50,
        },
        "2"
      );
      expect(r.passed).toBe(true);
    });

    it("is_empty: passes for empty string", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "is_empty", value: "", weight: 50 },
        ""
      );
      expect(r.passed).toBe(true);
    });

    it("is_not_empty: passes for non-empty string", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "is_not_empty", value: "", weight: 50 },
        "something"
      );
      expect(r.passed).toBe(true);
    });

    it("treats null answer as empty string (is_empty passes)", () => {
      const r = evaluateRule(
        { questionId: "q1", operator: "is_empty", value: "", weight: 50 },
        null
      );
      expect(r.passed).toBe(true);
    });
  });

  describe("formatCandidateForScreening", () => {
    it("includes basic info and response summary", () => {
      const app = {
        fullName: "Ali Veli",
        email: "ali@test.com",
        phone: "5551234567",
        responseSummary: {
          q_1: "Evet",
          q_2: "5 yıl",
        },
      };
      const questionMap = new Map([
        ["1", "Deneyim yılı?"],
        ["2", "Bildiğiniz diller?"],
      ]);
      const out = formatCandidateForScreening(app, "IT", questionMap);
      expect(out).toContain("Ali Veli");
      expect(out).toContain("ali@test.com");
      expect(out).toContain("IT");
      expect(out).toContain("Deneyim yılı?");
      expect(out).toContain("Evet");
      expect(out).toContain("5 yıl");
    });

    it("skips fullName, email, phone from responseSummary", () => {
      const app = {
        fullName: "Test",
        email: "t@t.com",
        phone: "555",
        responseSummary: {
          fullName: "Ignore",
          email: "e@e.com",
          q_1: "Answer",
        },
      };
      const questionMap = new Map([["1", "Soru 1"]]);
      const out = formatCandidateForScreening(app, "HR", questionMap);
      expect(out).toContain("Test");
      expect(out).toContain("Soru 1");
      expect(out).toContain("Answer");
    });

    it("handles null responseSummary", () => {
      const app = {
        fullName: "A",
        email: "a@a.com",
        phone: "1",
        responseSummary: null,
      };
      const out = formatCandidateForScreening(app, "Dept", new Map());
      expect(out).toContain("A");
      expect(out).toContain("Dept");
    });
  });
});
