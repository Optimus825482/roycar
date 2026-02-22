"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───

interface Department {
  id: string;
  name: string;
}

interface FormConfig {
  id: string;
  title: string;
  questions?: Question[];
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options?: unknown;
}

interface ScreeningRule {
  questionId: string;
  operator: string;
  value: string | string[];
  weight: number;
}

interface Criteria {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  formConfigId: string | null;
  isActive: boolean;
  criteriaRules: ScreeningRule[];
  passThreshold: number;
  useAiAssist: boolean;
  aiPrompt: string | null;
  department?: { name: string } | null;
  formConfig?: { title: string } | null;
  _count?: { results: number };
}

interface EvalReport {
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  fitAnalysis?: string;
  recommendation?: string;
  recommendationReason?: string;
}

interface EvalApplication {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  submittedAt: string;
  department: { id: string; name: string };
  evaluation: {
    id: string;
    overallScore: number;
    status: string;
    report: EvalReport;
    evaluatedAt: string | null;
    retryCount: number;
  } | null;
}

interface EvalStats {
  total: number;
  evaluated: number;
  pending: number;
  failed: number;
}

const OPERATORS = [
  { value: "equals", label: "Eşittir" },
  { value: "not_equals", label: "Eşit Değildir" },
  { value: "contains", label: "İçerir" },
  { value: "not_contains", label: "İçermez" },
  { value: "greater_than", label: "Büyüktür" },
  { value: "less_than", label: "Küçüktür" },
  { value: "in", label: "Listede Var" },
  { value: "not_in", label: "Listede Yok" },
  { value: "is_empty", label: "Boş" },
  { value: "is_not_empty", label: "Dolu" },
];

// ─── Score Color Helper ───

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function recLabel(rec: string): { text: string; cls: string } {
  switch (rec) {
    case "shortlist":
      return {
        text: "Kısa Listeye Al",
        cls: "bg-emerald-100 text-emerald-700",
      };
    case "interview":
      return { text: "Mülakata Çağır", cls: "bg-blue-100 text-blue-700" };
    case "reject":
      return { text: "Reddet", cls: "bg-red-100 text-red-700" };
    default:
      return { text: rec, cls: "bg-gray-100 text-gray-600" };
  }
}

export default function ScreeningPage() {
  const [activeTab, setActiveTab] = useState<"criteria" | "evaluation">(
    "evaluation",
  );

  // ─── Shared State ───
  const [departments, setDepartments] = useState<Department[]>([]);
  const [forms, setForms] = useState<FormConfig[]>([]);

  // ─── Criteria Tab State ───
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    departmentId: "",
    formConfigId: "",
    passThreshold: 60,
    useAiAssist: false,
    aiPrompt: "",
    rules: [] as ScreeningRule[],
  });
  const [selectedFormQuestions, setSelectedFormQuestions] = useState<
    Question[]
  >([]);

  // ─── Evaluation Tab State ───
  const [evalApps, setEvalApps] = useState<EvalApplication[]>([]);
  const [evalStats, setEvalStats] = useState<EvalStats>({
    total: 0,
    evaluated: 0,
    pending: 0,
    failed: 0,
  });
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalFilter, setEvalFilter] = useState("pending");
  const [evalDeptFilter, setEvalDeptFilter] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // ─── Fetch Helpers ───

  const fetchMeta = useCallback(async () => {
    try {
      const [dRes, fRes] = await Promise.all([
        fetch("/api/admin/applications/stats"),
        fetch("/api/admin/forms"),
      ]);
      const dJson = await dRes.json();
      const fJson = await fRes.json();
      if (dJson.success && dJson.data?.departments)
        setDepartments(dJson.data.departments);
      if (fJson.success) setForms(fJson.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchCriteria = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/screening");
      const json = await res.json();
      if (json.success) setCriteriaList(json.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  const fetchEvaluations = useCallback(async () => {
    setEvalLoading(true);
    try {
      const params = new URLSearchParams({ filter: evalFilter });
      if (evalDeptFilter) params.set("departmentId", evalDeptFilter);
      const res = await fetch(`/api/admin/evaluations?${params}`);
      const json = await res.json();
      if (json.success) {
        setEvalApps(json.data.applications);
        setEvalStats(json.data.stats);
      }
    } catch (err) {
      console.error(err);
    }
    setEvalLoading(false);
  }, [evalFilter, evalDeptFilter]);

  useEffect(() => {
    fetchMeta();
    fetchCriteria();
  }, [fetchMeta, fetchCriteria]);

  useEffect(() => {
    if (activeTab === "evaluation") fetchEvaluations();
  }, [activeTab, fetchEvaluations]);

  // ─── Criteria Form Helpers ───

  useEffect(() => {
    if (!formData.formConfigId) {
      setSelectedFormQuestions([]);
      return;
    }
    fetch(`/api/admin/forms/${formData.formConfigId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.questions)
          setSelectedFormQuestions(json.data.questions);
      })
      .catch(() => {});
  }, [formData.formConfigId]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      departmentId: "",
      formConfigId: "",
      passThreshold: 60,
      useAiAssist: false,
      aiPrompt: "",
      rules: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (c: Criteria) => {
    setFormData({
      name: c.name,
      description: c.description || "",
      departmentId: c.departmentId || "",
      formConfigId: c.formConfigId || "",
      passThreshold: c.passThreshold,
      useAiAssist: c.useAiAssist,
      aiPrompt: c.aiPrompt || "",
      rules: c.criteriaRules || [],
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const addRule = () => {
    setFormData((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        { questionId: "", operator: "equals", value: "", weight: 10 },
      ],
    }));
  };

  const updateRule = (index: number, field: string, value: unknown) => {
    setFormData((prev) => {
      const rules = [...prev.rules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...prev, rules };
    });
  };

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const saveCriteria = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    const payload = {
      name: formData.name,
      description: formData.description || null,
      departmentId: formData.departmentId || null,
      formConfigId: formData.formConfigId || null,
      passThreshold: formData.passThreshold,
      useAiAssist: formData.useAiAssist,
      aiPrompt: formData.aiPrompt || null,
      criteriaRules: formData.rules.filter((r) => r.questionId),
    };
    try {
      const url = editingId
        ? `/api/admin/screening/${editingId}`
        : "/api/admin/screening";
      const method = editingId ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      resetForm();
      fetchCriteria();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const deleteCriteria = async (id: string) => {
    if (!confirm("Bu kriteri silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/screening/${id}`, { method: "DELETE" });
      fetchCriteria();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/screening/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchCriteria();
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Evaluation Actions ───

  const runBatchEvaluation = async () => {
    setBatchRunning(true);
    try {
      const body: Record<string, unknown> = {
        onlyNew: evalFilter === "pending",
      };
      if (evalDeptFilter) body.departmentId = evalDeptFilter;
      const res = await fetch("/api/admin/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        alert(
          `${json.data.queued} başvuru değerlendirmeye alındı. Sonuçlar birkaç dakika içinde hazır olacak.`,
        );
        // Poll for results after a delay
        setTimeout(() => fetchEvaluations(), 5000);
      }
    } catch (err) {
      console.error(err);
      alert("Toplu değerlendirme başlatılamadı.");
    }
    setBatchRunning(false);
  };

  const retrySingleEvaluation = async (appId: string) => {
    setRetryingId(appId);
    try {
      await fetch(`/api/admin/evaluations/${appId}/retry`, { method: "POST" });
      setTimeout(() => fetchEvaluations(), 3000);
    } catch (err) {
      console.error(err);
    }
    setRetryingId(null);
  };

  const runSingleEvaluation = async (appId: string) => {
    setRetryingId(appId);
    try {
      await fetch("/api/admin/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationIds: [appId] }),
      });
      setTimeout(() => fetchEvaluations(), 3000);
    } catch (err) {
      console.error(err);
    }
    setRetryingId(null);
  };

  // ─── RENDER ───

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-mr-navy">
            Ön Eleme & AI Değerlendirme
          </h1>
          <p className="text-sm text-mr-text-muted mt-1">
            Kural tabanlı ön eleme kriterleri ve AI destekli aday
            değerlendirmesi
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("evaluation")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "evaluation"
              ? "border-mr-gold text-mr-navy"
              : "border-transparent text-mr-text-muted hover:text-mr-navy hover:border-gray-300"
          }`}
        >
          🤖 AI Değerlendirme
        </button>
        <button
          onClick={() => setActiveTab("criteria")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "criteria"
              ? "border-mr-gold text-mr-navy"
              : "border-transparent text-mr-text-muted hover:text-mr-navy hover:border-gray-300"
          }`}
        >
          📋 Kriter Yönetimi
        </button>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* AI EVALUATION TAB */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "evaluation" && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEvalFilter("all")}
            >
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold text-mr-navy">
                  {evalStats.total}
                </div>
                <div className="text-xs text-mr-text-muted">Toplam Başvuru</div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEvalFilter("pending")}
            >
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold text-amber-600">
                  {evalStats.pending}
                </div>
                <div className="text-xs text-mr-text-muted">
                  Değerlendirilmemiş
                </div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEvalFilter("completed")}
            >
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold text-emerald-600">
                  {evalStats.evaluated}
                </div>
                <div className="text-xs text-mr-text-muted">
                  Değerlendirilmiş
                </div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEvalFilter("failed")}
            >
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold text-red-600">
                  {evalStats.failed}
                </div>
                <div className="text-xs text-mr-text-muted">Başarısız</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Actions */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={evalDeptFilter}
                  onChange={(e) => setEvalDeptFilter(e.target.value)}
                >
                  <option value="">Tüm Departmanlar</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-3 py-2 text-sm"
                  value={evalFilter}
                  onChange={(e) => setEvalFilter(e.target.value)}
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Değerlendirilmemiş</option>
                  <option value="completed">Değerlendirilmiş</option>
                  <option value="failed">Başarısız</option>
                </select>

                <div className="flex-1" />

                <Button
                  onClick={fetchEvaluations}
                  variant="outline"
                  size="sm"
                  disabled={evalLoading}
                >
                  {evalLoading ? "Yükleniyor..." : "Yenile"}
                </Button>

                <Button
                  onClick={runBatchEvaluation}
                  disabled={batchRunning || evalStats.pending === 0}
                  className="bg-mr-gold hover:bg-mr-gold-dark text-white"
                  size="sm"
                >
                  {batchRunning
                    ? "Başlatılıyor..."
                    : `🤖 Toplu Değerlendir (${evalStats.pending})`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Application List */}
          {evalLoading ? (
            <p className="text-sm text-mr-text-muted py-4">Yükleniyor...</p>
          ) : evalApps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-mr-text-muted">
                  {evalFilter === "pending"
                    ? "Değerlendirilmemiş başvuru bulunamadı."
                    : "Bu filtreye uygun başvuru bulunamadı."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {evalApps.map((app) => {
                const ev = app.evaluation;
                const isExpanded = expandedEval === app.id;
                const report = ev?.report as EvalReport | undefined;

                return (
                  <Card key={app.id} className="overflow-hidden">
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-mr-bg-secondary/50 transition-colors"
                      onClick={() =>
                        setExpandedEval(isExpanded ? null : app.id)
                      }
                    >
                      {/* Score Badge */}
                      <div className="shrink-0 w-14 text-center">
                        {ev?.status === "completed" ? (
                          <span
                            className={`inline-block px-2 py-1 rounded-md text-sm font-bold border ${scoreColor(ev.overallScore)}`}
                          >
                            {ev.overallScore}
                          </span>
                        ) : ev?.status === "pending" ? (
                          <span className="inline-block px-2 py-1 rounded-md text-xs bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                            ⏳
                          </span>
                        ) : ev?.status === "failed" ? (
                          <span className="inline-block px-2 py-1 rounded-md text-xs bg-red-50 text-red-600 border border-red-200">
                            ✕
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-md text-xs bg-gray-50 text-gray-400 border border-gray-200">
                            —
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-mr-navy truncate">
                            {app.fullName}
                          </span>
                          <span className="text-xs text-mr-text-muted">
                            #{app.applicationNo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-mr-text-muted mt-0.5">
                          <span>{app.department.name}</span>
                          <span>
                            {new Date(app.submittedAt).toLocaleDateString(
                              "tr-TR",
                            )}
                          </span>
                          {report?.recommendation && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${recLabel(report.recommendation).cls}`}
                            >
                              {recLabel(report.recommendation).text}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className="shrink-0 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!ev || ev.status === "failed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingId === app.id}
                            onClick={() =>
                              ev
                                ? retrySingleEvaluation(app.id)
                                : runSingleEvaluation(app.id)
                            }
                            className="text-xs"
                          >
                            {retryingId === app.id ? "..." : "🤖 Değerlendir"}
                          </Button>
                        ) : ev.status === "pending" ? (
                          <span className="text-xs text-amber-600 animate-pulse">
                            İşleniyor...
                          </span>
                        ) : null}
                      </div>

                      {/* Expand Arrow */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`shrink-0 text-mr-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && ev?.status === "completed" && report && (
                      <div className="border-t px-4 py-4 bg-mr-bg-secondary/30 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Score & Recommendation */}
                          <div>
                            <div className="text-xs font-medium text-mr-text-muted mb-1">
                              Genel Puan
                            </div>
                            <div
                              className={`text-3xl font-bold ${ev.overallScore >= 75 ? "text-emerald-600" : ev.overallScore >= 50 ? "text-amber-600" : "text-red-600"}`}
                            >
                              {ev.overallScore}
                              <span className="text-sm font-normal text-mr-text-muted">
                                /100
                              </span>
                            </div>
                            {report.recommendation && (
                              <span
                                className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${recLabel(report.recommendation).cls}`}
                              >
                                {recLabel(report.recommendation).text}
                              </span>
                            )}
                          </div>

                          {/* Summary */}
                          <div className="md:col-span-2">
                            {report.summary && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-mr-text-muted mb-1">
                                  Özet
                                </div>
                                <p className="text-sm text-mr-text-primary">
                                  {report.summary}
                                </p>
                              </div>
                            )}
                            {report.fitAnalysis && (
                              <div>
                                <div className="text-xs font-medium text-mr-text-muted mb-1">
                                  Pozisyon Uyumu
                                </div>
                                <p className="text-sm text-mr-text-primary">
                                  {report.fitAnalysis}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.strengths && report.strengths.length > 0 && (
                            <div className="bg-emerald-50 rounded-md p-3">
                              <div className="text-xs font-medium text-emerald-700 mb-1">
                                💪 Güçlü Yönler
                              </div>
                              <ul className="text-sm text-emerald-800 space-y-0.5">
                                {report.strengths.map((s, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-1"
                                  >
                                    <span className="text-emerald-500 mt-0.5">
                                      •
                                    </span>{" "}
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {report.weaknesses &&
                            report.weaknesses.length > 0 && (
                              <div className="bg-red-50 rounded-md p-3">
                                <div className="text-xs font-medium text-red-700 mb-1">
                                  ⚠️ Zayıf Yönler / Riskler
                                </div>
                                <ul className="text-sm text-red-800 space-y-0.5">
                                  {report.weaknesses.map((w, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-1"
                                    >
                                      <span className="text-red-500 mt-0.5">
                                        •
                                      </span>{" "}
                                      {w}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>

                        {report.recommendationReason && (
                          <div className="text-xs text-mr-text-muted italic">
                            Gerekçe: {report.recommendationReason}
                          </div>
                        )}

                        {ev.evaluatedAt && (
                          <div className="text-xs text-mr-text-muted">
                            Değerlendirilme:{" "}
                            {new Date(ev.evaluatedAt).toLocaleString("tr-TR")}
                          </div>
                        )}
                      </div>
                    )}

                    {isExpanded && (!ev || ev.status !== "completed") && (
                      <div className="border-t px-4 py-4 bg-mr-bg-secondary/30">
                        <p className="text-sm text-mr-text-muted">
                          {!ev
                            ? 'Bu başvuru henüz AI tarafından değerlendirilmedi. "Değerlendir" butonuna tıklayarak başlatabilirsiniz.'
                            : ev.status === "pending"
                              ? "Değerlendirme devam ediyor... Birkaç saniye içinde sonuç hazır olacak."
                              : `Değerlendirme başarısız oldu (${ev.retryCount} deneme). Tekrar deneyebilirsiniz.`}
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* CRITERIA MANAGEMENT TAB */}
      {/* ═══════════════════════════════════════════════ */}
      {activeTab === "criteria" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-mr-navy hover:bg-mr-navy-light"
            >
              + Yeni Kriter
            </Button>
          </div>

          {/* Criteria Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {editingId ? "Kriter Düzenle" : "Yeni Kriter Oluştur"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-mr-text-primary">
                      Kriter Adı *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Örn: Otel Deneyimi Kontrolü"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mr-text-primary">
                      Geçme Eşiği (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.passThreshold}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          passThreshold: parseInt(e.target.value) || 60,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-mr-text-primary">
                    Açıklama
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Kriter açıklaması..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-mr-text-primary">
                      Departman (opsiyonel)
                    </label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          departmentId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Tüm Departmanlar</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mr-text-primary">
                      Form (opsiyonel)
                    </label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={formData.formConfigId}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          formConfigId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Tüm Formlar</option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rules */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-mr-navy">
                      Kural Tabanlı Değerlendirme
                    </h3>
                    <Button variant="outline" size="sm" onClick={addRule}>
                      + Kural Ekle
                    </Button>
                  </div>
                  {formData.rules.length === 0 ? (
                    <p className="text-xs text-mr-text-muted">
                      Henüz kural eklenmedi.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-mr-bg-secondary rounded-md"
                        >
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                            <select
                              className="border rounded px-2 py-1.5 text-sm"
                              value={rule.questionId}
                              onChange={(e) =>
                                updateRule(idx, "questionId", e.target.value)
                              }
                            >
                              <option value="">Soru seçin</option>
                              {selectedFormQuestions.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.questionText.slice(0, 40)}
                                </option>
                              ))}
                            </select>
                            <select
                              className="border rounded px-2 py-1.5 text-sm"
                              value={rule.operator}
                              onChange={(e) =>
                                updateRule(idx, "operator", e.target.value)
                              }
                            >
                              {OPERATORS.map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                            {!["is_empty", "is_not_empty"].includes(
                              rule.operator,
                            ) && (
                              <Input
                                className="text-sm"
                                placeholder="Değer"
                                value={
                                  Array.isArray(rule.value)
                                    ? rule.value.join(", ")
                                    : rule.value
                                }
                                onChange={(e) => {
                                  const val = ["in", "not_in"].includes(
                                    rule.operator,
                                  )
                                    ? e.target.value
                                        .split(",")
                                        .map((v) => v.trim())
                                    : e.target.value;
                                  updateRule(idx, "value", val);
                                }}
                              />
                            )}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="text-sm w-20"
                                value={rule.weight}
                                onChange={(e) =>
                                  updateRule(
                                    idx,
                                    "weight",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                              <span className="text-xs text-mr-text-muted">
                                ağırlık
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeRule(idx)}
                            className="p-1 text-red-400 hover:text-red-600 mt-1"
                            aria-label="Kuralı sil"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Assist */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useAiAssist}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          useAiAssist: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-mr-navy">
                      AI Destekli Değerlendirme
                    </span>
                  </label>
                  <p className="text-xs text-mr-text-muted mt-1 ml-6">
                    Yapay zeka, adayın yanıtlarını analiz ederek ek bir
                    değerlendirme puanı verir.
                    {formData.rules.length > 0 &&
                      " Kurallarla birlikte kullanıldığında %60 kural + %40 AI ağırlığı uygulanır."}
                  </p>
                  {formData.useAiAssist && (
                    <div className="mt-3 ml-6">
                      <label className="text-sm font-medium text-mr-text-primary">
                        Özel AI Promptu (opsiyonel)
                      </label>
                      <Textarea
                        value={formData.aiPrompt}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            aiPrompt: e.target.value,
                          }))
                        }
                        placeholder="AI'ya özel değerlendirme kriterleri ekleyin..."
                        rows={3}
                      />
                      <p className="text-xs text-mr-text-muted mt-1">
                        Boş bırakırsanız varsayılan ön eleme promptu kullanılır.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm}>
                    İptal
                  </Button>
                  <Button
                    onClick={saveCriteria}
                    disabled={saving || !formData.name.trim()}
                    className="bg-mr-gold hover:bg-mr-gold-dark text-white"
                  >
                    {saving
                      ? "Kaydediliyor..."
                      : editingId
                        ? "Güncelle"
                        : "Oluştur"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Criteria List */}
          {loading ? (
            <p className="text-sm text-mr-text-muted">Yükleniyor...</p>
          ) : criteriaList.length === 0 && !showForm ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-mr-text-muted mb-2">
                  Henüz ön eleme kriteri tanımlanmamış.
                </p>
                <Button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-mr-navy hover:bg-mr-navy-light"
                >
                  İlk Kriteri Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {criteriaList.map((c) => (
                <Card key={c.id} className={!c.isActive ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-mr-navy">{c.name}</h3>
                          {!c.isActive && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                              Pasif
                            </span>
                          )}
                          {c.useAiAssist && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                              🤖 AI Destekli
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-sm text-mr-text-muted mt-1">
                            {c.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-mr-text-muted">
                          <span>Eşik: %{c.passThreshold}</span>
                          <span>Kural: {(c.criteriaRules || []).length}</span>
                          {c.department && (
                            <span>Departman: {c.department.name}</span>
                          )}
                          {c.formConfig && (
                            <span>Form: {c.formConfig.title}</span>
                          )}
                          <span>Sonuç: {c._count?.results ?? 0}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(c.id, c.isActive)}
                        >
                          {c.isActive ? "Pasifleştir" : "Aktifleştir"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(c)}
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:border-red-300"
                          onClick={() => deleteCriteria(c.id)}
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
