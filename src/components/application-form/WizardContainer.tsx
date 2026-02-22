"use client";

import { useState, useEffect, useCallback } from "react";
import { QuestionRenderer } from "./QuestionRenderer";
import { WizardNavigation } from "./WizardNavigation";
import { ProgressIndicator } from "./ProgressIndicator";
import { RoyalLoader } from "@/components/shared/RoyalLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

// ─── Types ───

interface QuestionImage {
  id: string;
  filePath: string;
  fileName: string;
  sortOrder: number;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  sortOrder: number;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  images: QuestionImage[];
  groupLabel: string | null;
}

interface BranchingRule {
  id: string;
  sourceQuestionId: string;
  targetQuestionId: string;
  conditionLogic: "AND" | "OR";
  conditions: {
    field: string;
    operator: string;
    value: string | string[];
  }[];
  priority: number;
}

interface Department {
  id: string;
  name: string;
}

interface FormData {
  id: string;
  title: string;
  mode: "static" | "dynamic";
  questions: Question[];
  branchingRules: BranchingRule[];
}

type WizardStep = "info" | "questions" | "review";

// ─── Branching Engine ───

function evaluateSingleCondition(
  condition: { field: string; operator: string; value: string | string[] },
  answer: string | string[] | null,
): boolean {
  const answerStr = Array.isArray(answer) ? answer.join(",") : answer || "";

  switch (condition.operator) {
    case "equals":
      return answerStr === condition.value;
    case "not_equals":
      return answerStr !== condition.value;
    case "contains":
      return answerStr
        .toLowerCase()
        .includes((condition.value as string).toLowerCase());
    case "in":
      if (Array.isArray(condition.value)) {
        return condition.value.includes(answerStr);
      }
      return false;
    case "greater_than":
      return Number(answerStr) > Number(condition.value);
    case "less_than":
      return Number(answerStr) < Number(condition.value);
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: { field: string; operator: string; value: string | string[] }[],
  logic: "AND" | "OR",
  answer: string | string[] | null,
): boolean {
  const results = conditions.map((c) => evaluateSingleCondition(c, answer));
  return logic === "AND" ? results.every(Boolean) : results.some(Boolean);
}

// ─── Component ───

export function WizardContainer() {
  const router = useRouter();

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [form, setForm] = useState<FormData | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Wizard state
  const [step, setStep] = useState<WizardStep>("info");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [questionPath, setQuestionPath] = useState<number[]>([0]);
  const [answers, setAnswers] = useState<
    Record<string, string | string[] | null>
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Candidate info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Load form + departments ───
  useEffect(() => {
    async function load() {
      try {
        const [formRes, deptRes] = await Promise.all([
          fetch("/api/apply/active-form"),
          fetch("/api/departments"),
        ]);
        const formJson = await formRes.json();
        const deptJson = await deptRes.json();

        if (!formJson.success || !formJson.data) {
          setError(
            "Şu anda açık pozisyon bulunmamaktadır. Lütfen daha sonra tekrar deneyin.",
          );
          return;
        }

        // BigInt → string serialization
        const raw = formJson.data;
        const questions: Question[] = (raw.questions || []).map(
          (q: Record<string, unknown>) => ({
            id: String(q.id),
            questionText: q.questionText || q.question_text,
            questionType: q.questionType || q.question_type,
            isRequired: q.isRequired ?? q.is_required ?? true,
            sortOrder: q.sortOrder ?? q.sort_order ?? 0,
            options: q.options || null,
            validation: q.validation || null,
            metadata: q.metadata || null,
            groupLabel: q.groupLabel || q.group_label || null,
            images: ((q.images as Record<string, unknown>[]) || []).map(
              (img: Record<string, unknown>) => ({
                id: String(img.id),
                filePath: img.filePath || img.file_path,
                fileName: img.fileName || img.file_name,
                sortOrder: img.sortOrder ?? img.sort_order ?? 0,
              }),
            ),
          }),
        );

        const branchingRules: BranchingRule[] = (raw.branchingRules || []).map(
          (r: Record<string, unknown>) => ({
            id: String(r.id),
            sourceQuestionId: String(
              r.sourceQuestionId || r.source_question_id,
            ),
            targetQuestionId: String(
              r.targetQuestionId || r.target_question_id,
            ),
            conditionLogic: r.conditionLogic || r.condition_logic || "AND",
            conditions: r.conditions || [],
            priority: r.priority || 0,
          }),
        );

        setForm({
          id: String(raw.id),
          title: raw.title,
          mode: raw.mode,
          questions,
          branchingRules,
        });

        if (deptJson.success && deptJson.data) {
          setDepartments(
            (deptJson.data as Record<string, unknown>[]).map((d) => ({
              id: String(d.id),
              name: d.name as string,
            })),
          );
        }
      } catch {
        setError("Form yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Navigation helpers ───

  const currentQuestion = form?.questions[currentQIndex] ?? null;
  const totalQuestions = form?.questions.length ?? 0;

  const getNextQuestion = useCallback((): number | null => {
    if (!form) return null;
    const q = form.questions[currentQIndex];
    if (!q) return null;

    if (form.mode === "dynamic") {
      const currentAnswer = answers[q.id];
      const rules = form.branchingRules
        .filter((r) => r.sourceQuestionId === q.id)
        .sort((a, b) => a.priority - b.priority);

      for (const rule of rules) {
        if (
          evaluateConditions(
            rule.conditions,
            rule.conditionLogic,
            currentAnswer,
          )
        ) {
          const targetIdx = form.questions.findIndex(
            (fq) => fq.id === rule.targetQuestionId,
          );
          if (targetIdx !== -1) return targetIdx;
        }
      }
    }

    // Static mode or no matching rule → next in order
    const nextIdx = currentQIndex + 1;
    return nextIdx < form.questions.length ? nextIdx : null;
  }, [form, currentQIndex, answers]);

  const validateCurrentAnswer = useCallback((): boolean => {
    if (!currentQuestion) return true;
    if (!currentQuestion.isRequired) return true;

    const answer = answers[currentQuestion.id];
    if (answer === null || answer === undefined) {
      setValidationError("Bu soru zorunludur.");
      return false;
    }
    if (typeof answer === "string" && answer.trim() === "") {
      setValidationError("Bu soru zorunludur.");
      return false;
    }
    if (Array.isArray(answer) && answer.length === 0) {
      setValidationError("En az bir seçenek seçmelisiniz.");
      return false;
    }
    setValidationError(null);
    return true;
  }, [currentQuestion, answers]);

  const handleNext = useCallback(() => {
    if (!validateCurrentAnswer()) return;
    const nextIdx = getNextQuestion();
    if (nextIdx !== null) {
      setCurrentQIndex(nextIdx);
      setQuestionPath((prev) => [...prev, nextIdx]);
      setValidationError(null);
    } else {
      // No more questions → go to review
      setStep("review");
    }
  }, [validateCurrentAnswer, getNextQuestion]);

  const handleBack = useCallback(() => {
    if (step === "review") {
      setStep("questions");
      return;
    }
    if (questionPath.length > 1) {
      const newPath = [...questionPath];
      newPath.pop();
      const prevIdx = newPath[newPath.length - 1];
      setCurrentQIndex(prevIdx);
      setQuestionPath(newPath);
      setValidationError(null);
    } else {
      // First question → go back to info
      setStep("info");
    }
  }, [step, questionPath]);

  const isLastQuestion = getNextQuestion() === null;

  // ─── Info step validation ───

  const validateInfo = useCallback((): boolean => {
    if (!fullName.trim()) {
      setInfoError("Ad Soyad zorunludur.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInfoError("Geçerli bir e-posta adresi giriniz.");
      return false;
    }
    if (!phone.trim()) {
      setInfoError("Telefon numarası zorunludur.");
      return false;
    }
    if (!departmentId) {
      setInfoError("Departman seçimi zorunludur.");
      return false;
    }
    setInfoError(null);
    return true;
  }, [fullName, email, phone, departmentId]);

  const handleInfoNext = useCallback(() => {
    if (!validateInfo()) return;
    setStep("questions");
  }, [validateInfo]);

  // ─── Submit ───

  const handleSubmit = useCallback(async () => {
    if (!form) return;
    setIsSubmitting(true);

    try {
      // Upload photo if exists
      let photoPath: string | null = null;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const uploadRes = await fetch("/api/apply/upload", {
          method: "POST",
          body: fd,
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success) {
          photoPath = uploadJson.data.filePath;
        }
      }

      // Upload file-type answers
      const processedAnswers: Record<
        string,
        { answerText?: string; answerJson?: unknown; answerFile?: string }
      > = {};

      for (const [qId, answer] of Object.entries(answers)) {
        if (answer === null || answer === undefined) continue;

        const question = form.questions.find((q) => q.id === qId);
        if (!question) continue;

        if (question.questionType === "file") {
          // File answers: look for the actual File object in the DOM
          const fileInput = document.querySelector(
            `[data-file-input="${qId}"]`,
          ) as HTMLInputElement | null;
          if (fileInput?.files?.[0]) {
            const fd = new FormData();
            fd.append("file", fileInput.files[0]);
            const uploadRes = await fetch("/api/apply/upload", {
              method: "POST",
              body: fd,
            });
            const uploadJson = await uploadRes.json();
            if (uploadJson.success) {
              processedAnswers[qId] = { answerFile: uploadJson.data.filePath };
            }
          }
        } else if (
          question.questionType === "checkbox" &&
          Array.isArray(answer)
        ) {
          processedAnswers[qId] = { answerJson: answer };
        } else {
          processedAnswers[qId] = { answerText: answer as string };
        }
      }

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formConfigId: form.id,
          departmentId,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          photoPath,
          answers: processedAnswers,
        }),
      });

      const json = await res.json();
      if (json.success) {
        router.push(
          `/basvuru/onay?no=${encodeURIComponent(json.data.applicationNo)}`,
        );
      } else {
        setError(json.error || "Başvuru gönderilemedi.");
        setStep("review");
      }
    } catch {
      setError("Başvuru gönderilirken bir hata oluştu.");
      setStep("review");
    } finally {
      setIsSubmitting(false);
    }
  }, [form, answers, fullName, email, phone, departmentId, photoFile, router]);

  // ─── Render ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RoyalLoader size="lg" text="Form yükleniyor..." variant="spinner" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">😔</div>
        <h2 className="text-xl font-semibold text-mr-navy">Sayfa Bulunamadı</h2>
        <p className="text-mr-text-secondary">{error}</p>
      </div>
    );
  }

  if (!form || form.questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">📋</div>
        <h2 className="text-xl font-semibold text-mr-navy">
          Şu anda açık pozisyon bulunmamaktadır
        </h2>
        <p className="text-mr-text-secondary">
          Lütfen daha sonra tekrar deneyin.
        </p>
      </div>
    );
  }

  // ─── Step: Info ───
  if (step === "info") {
    return (
      <div className="space-y-6" role="form" aria-label="Kişisel bilgiler">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-mr-navy font-heading">
            Kişisel Bilgiler
          </h2>
          <p className="text-mr-text-secondary">
            Başlamak için bilgilerinizi girin.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="fullName"
              className="text-sm font-medium text-mr-navy"
            >
              Ad Soyad{" "}
              <span className="text-mr-error" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(zorunlu)</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adınız ve soyadınız"
              className="mt-1 h-12 text-base"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-mr-navy">
              E-posta{" "}
              <span className="text-mr-error" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(zorunlu)</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              className="mt-1 h-12 text-base"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-mr-navy">
              Telefon{" "}
              <span className="text-mr-error" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(zorunlu)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
              className="mt-1 h-12 text-base"
              required
              aria-required="true"
            />
          </div>

          <div>
            <Label
              htmlFor="department"
              className="text-sm font-medium text-mr-navy"
            >
              Tercih Edilen Departman{" "}
              <span className="text-mr-error" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(zorunlu)</span>
            </Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger
                className="mt-1 h-12 text-base"
                id="department"
                aria-required="true"
              >
                <SelectValue placeholder="Departman seçiniz..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="photo" className="text-sm font-medium text-mr-navy">
              Fotoğraf (opsiyonel)
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              className="mt-1 h-12 text-base file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-mr-navy file:text-white hover:file:bg-mr-navy-light"
            />
          </div>
        </div>

        {infoError && (
          <p className="text-sm text-mr-error text-center" role="alert">
            {infoError}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleInfoNext}
            className="px-8 py-3 bg-mr-navy text-white rounded-lg hover:bg-mr-navy-light transition-colors text-base font-medium focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
            aria-label="Sorulara geç"
          >
            Sorulara Geç →
          </button>
        </div>
      </div>
    );
  }

  // ─── Step: Review ───
  if (step === "review") {
    return (
      <div className="space-y-6" role="region" aria-label="Özet">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-mr-navy font-heading">
            Özet
          </h2>
          <p className="text-mr-text-secondary">
            Bilgilerinizi kontrol edin ve gönderin.
          </p>
        </div>

        {/* Kişisel bilgiler özeti */}
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <h3 className="font-medium text-mr-navy">İletişim Bilgileri</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-mr-text-muted">Ad Soyad:</dt>
            <dd className="text-mr-text-primary">{fullName}</dd>
            <dt className="text-mr-text-muted">E-posta:</dt>
            <dd className="text-mr-text-primary">{email}</dd>
            <dt className="text-mr-text-muted">Telefon:</dt>
            <dd className="text-mr-text-primary">{phone}</dd>
            <dt className="text-mr-text-muted">Departman:</dt>
            <dd className="text-mr-text-primary">
              {departments.find((d) => d.id === departmentId)?.name || "-"}
            </dd>
          </dl>
        </div>

        {/* Yanıtlar özeti */}
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="font-medium text-mr-navy">Yanıtlarınız</h3>
          <dl className="space-y-3">
            {questionPath.map((qIdx) => {
              const q = form.questions[qIdx];
              if (!q) return null;
              const answer = answers[q.id];
              const displayAnswer = Array.isArray(answer)
                ? answer.join(", ")
                : answer || "—";
              return (
                <div
                  key={q.id}
                  className="text-sm border-b last:border-0 pb-2 last:pb-0"
                >
                  <dt className="text-mr-text-muted">{q.questionText}</dt>
                  <dd className="text-mr-text-primary font-medium">
                    {displayAnswer}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {error && (
          <p className="text-sm text-mr-error text-center" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleBack}
            className="px-6 py-3 border border-border rounded-lg hover:bg-mr-bg-secondary transition-colors text-base focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
            aria-label="Sorulara geri dön"
          >
            ← Geri
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 bg-mr-gold text-white rounded-lg hover:bg-mr-gold-dark transition-colors text-base font-medium disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2"
            aria-label="Gönder"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step: Questions ───
  return (
    <div className="space-y-6">
      <ProgressIndicator
        current={questionPath.indexOf(currentQIndex)}
        total={
          form.mode === "static"
            ? totalQuestions
            : questionPath.length + (isLastQuestion ? 0 : 1)
        }
      />

      {currentQuestion?.groupLabel && (
        <p className="text-sm font-medium text-mr-gold uppercase tracking-wide">
          {currentQuestion.groupLabel}
        </p>
      )}

      <QuestionRenderer
        question={{
          id: currentQuestion!.id,
          questionText: currentQuestion!.questionText,
          questionType: currentQuestion!.questionType,
          isRequired: currentQuestion!.isRequired,
          options: currentQuestion!.options,
          images: currentQuestion!.images,
          metadata: currentQuestion!.metadata,
        }}
        value={answers[currentQuestion!.id] ?? null}
        onChange={(val) => {
          setAnswers((prev) => ({ ...prev, [currentQuestion!.id]: val }));
          setValidationError(null);
        }}
        error={validationError || undefined}
      />

      <WizardNavigation
        canGoBack={true}
        canGoForward={true}
        isLastQuestion={isLastQuestion}
        isSubmitting={false}
        onBack={handleBack}
        onNext={handleNext}
        onSubmit={() => {
          if (!validateCurrentAnswer()) return;
          setStep("review");
        }}
      />
    </div>
  );
}
