"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AppLoader } from "@/components/shared/AppLoader";
import { EvaluationAiAssistant } from "@/components/admin/evaluation/EvaluationAiAssistant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ───

interface Department {
  id: string;
  name: string;
}

interface FieldDefinition {
  id: string;
  fieldName: string;
  normalizedName: string;
  fieldCategory: string;
  dataType: string;
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

interface EvalRecord {
  id: string;
  overallScore: number;
  status: string;
  report: EvalReport;
  customCriteria?: Array<{
    label: string;
    description?: string;
    weight?: string;
  }> | null;
  evaluationLabel?: string | null;
  evaluatedAt: string | null;
  retryCount: number;
  createdAt?: string;
}

interface EvalApplication {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  submittedAt: string;
  positionTitle?: string | null;
  department: { id: string; name: string } | null;
  evaluation: EvalRecord | null;
  evaluationHistory?: EvalRecord[];
  evaluationCount?: number;
}

interface EvalStats {
  total: number;
  evaluated: number;
  pending: number;
  failed: number;
}

interface EvalAction {
  type:
    | "PRE_FILTER"
    | "BATCH_EVALUATE"
    | "SINGLE_EVALUATE"
    | "CLEAR_FILTER"
    | "DEPT_FILTER"
    | "REFRESH_DATA"
    | "UPDATE_STATUS";
  payload?: Record<string, unknown>;
}

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
      return { text: rec, cls: "bg-gray-100 text-gray-700" };
  }
}

export default function EvaluationPage() {
  // ─── State ───
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // Evaluation state
  const [evalApps, setEvalApps] = useState<EvalApplication[]>([]);
  const [evalStats, setEvalStats] = useState<EvalStats>({
    total: 0,
    evaluated: 0,
    pending: 0,
    failed: 0,
  });
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalFilter, setEvalFilter] = useState("all");
  const [evalDeptFilter, setEvalDeptFilter] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [expandedEval, setExpandedEval] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [preFilterActive, setPreFilterActive] = useState(false);

  // Batch completion tracking
  const [pendingBatchNotify, setPendingBatchNotify] = useState(false);
  const [showBatchEmailDialog, setShowBatchEmailDialog] = useState(false);
  const [batchCompletedApps, setBatchCompletedApps] = useState<string[]>([]);
  const [sendingBatchEmail, setSendingBatchEmail] = useState(false);
  const pollAttemptsRef = useRef(0);

  // Session (Yeni Değerlendirme Oluştur) modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionLabel, setSessionLabel] = useState("");
  const [sessionDesc, setSessionDesc] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  // Gruba Ekle modal
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [addToGroupAppId, setAddToGroupAppId] = useState<string | null>(null);
  const [addToGroupEvalId, setAddToGroupEvalId] = useState<string | null>(null);
  const [candidateGroups, setCandidateGroups] = useState<
    Array<{ id: string; name: string; memberCount: number }>
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [addingToGroup, setAddingToGroup] = useState(false);

  // ─── Fetch Helpers ───

  const fetchMeta = useCallback(async () => {
    try {
      const [dRes, fRes] = await Promise.all([
        fetch("/api/admin/applications/stats"),
        fetch("/api/admin/evaluations/pre-filter"),
      ]);
      const dJson = await dRes.json();
      const fJson = await fRes.json();
      if (dJson.success && dJson.data?.departments)
        setDepartments(dJson.data.departments);
      if (fJson.success) setFieldDefs(fJson.data || []);
    } catch {
      toast.error("Meta veriler yüklenemedi");
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
    } catch {
      toast.error("Değerlendirmeler yüklenemedi");
    }
    setEvalLoading(false);
  }, [evalFilter, evalDeptFilter]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);
  useEffect(() => {
    if (!preFilterActive) fetchEvaluations();
  }, [preFilterActive, fetchEvaluations]);

  // Batch polling
  useEffect(() => {
    if (!pendingBatchNotify) return;
    pollAttemptsRef.current = 0;
    const intervalId = setInterval(async () => {
      pollAttemptsRef.current += 1;
      await fetchEvaluations();
      if (pollAttemptsRef.current >= 10) {
        clearInterval(intervalId);
        setPendingBatchNotify(false);
        toast.warning("Değerlendirmeler devam ediyor", {
          description: "Sayfayı birkaç dakika sonra yenileyin.",
        });
      }
    }, 8000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBatchNotify]);

  // Batch complete dialog
  useEffect(() => {
    if (!pendingBatchNotify) return;
    if (evalStats.pending !== 0) return;
    setPendingBatchNotify(false);
    const completedIds = evalApps
      .filter((a) => a.evaluation?.status === "completed" && a.email)
      .map((a) => a.id);
    if (completedIds.length > 0) {
      setBatchCompletedApps(completedIds);
      setShowBatchEmailDialog(true);
    }
  }, [pendingBatchNotify, evalStats.pending, evalApps]);

  // ─── Pre-Filter via AI ───

  const runPreFilterFromAI = async (
    criteria: Array<{ fieldName: string; operator: string; value: string }>,
    positionId?: string,
  ) => {
    // Convert fieldName (normalizedName) to fieldDefinitionId
    const mappedCriteria = criteria
      .map((c) => {
        const fd = fieldDefs.find((f) => f.normalizedName === c.fieldName);
        return {
          fieldDefinitionId: fd?.id || "",
          operator: c.operator,
          value: c.value,
        };
      })
      .filter((c) => c.fieldDefinitionId);

    if (mappedCriteria.length === 0 && !positionId) {
      toast.error("Geçerli kriter bulunamadı");
      return;
    }

    setPreFilterActive(true);
    setEvalLoading(true);
    try {
      const res = await fetch("/api/admin/evaluations/pre-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: mappedCriteria,
          positionId: positionId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const apps = json.data.applications as EvalApplication[];
        setEvalApps(apps);
        setEvalStats({
          total: apps.length,
          evaluated: apps.filter((a) => a.evaluation?.status === "completed")
            .length,
          pending: apps.filter(
            (a) => !a.evaluation || a.evaluation.status === "pending",
          ).length,
          failed: apps.filter((a) => a.evaluation?.status === "failed").length,
        });
        toast.success(`${apps.length} aday kriterlere uyuyor`);
      } else {
        toast.error(json.error || "Filtreleme başarısız");
      }
    } catch {
      toast.error("Filtreleme yapılamadı");
    }
    setEvalLoading(false);
  };

  const clearPreFilter = () => {
    setPreFilterActive(false);
    fetchEvaluations();
  };

  // ─── Evaluation Actions ───

  const runBatchEvaluation = async (
    customCriteria?: Array<{
      label: string;
      description?: string;
      weight?: string;
    }>,
  ) => {
    setBatchRunning(true);
    try {
      const pendingApps = evalApps.filter(
        (a) => !a.evaluation || a.evaluation.status === "failed",
      );
      const body: Record<string, unknown> = preFilterActive
        ? { applicationIds: pendingApps.map((a) => a.id) }
        : {
            onlyNew: evalFilter === "pending",
            ...(evalDeptFilter ? { departmentId: evalDeptFilter } : {}),
          };

      if (customCriteria && customCriteria.length > 0) {
        body.customCriteria = customCriteria;
      }

      const res = await fetch("/api/admin/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        const queued: number = json.data.queued ?? 0;
        toast.success(
          `${queued} başvuru değerlendirmeye alındı. Sonuçlar birkaç dakika içinde hazır olacak.`,
          { duration: 7000 },
        );
        if (queued > 0) setPendingBatchNotify(true);
        else setTimeout(() => fetchEvaluations(), 5000);
      }
    } catch {
      toast.error("Toplu değerlendirme başlatılamadı");
    }
    setBatchRunning(false);
  };

  const retrySingleEvaluation = async (appId: string) => {
    setRetryingId(appId);
    try {
      await fetch(`/api/admin/evaluations/${appId}/retry`, { method: "POST" });
      setTimeout(() => fetchEvaluations(), 3000);
    } catch {
      toast.error("Değerlendirme yeniden başlatılamadı");
    }
    setRetryingId(null);
  };

  const runSingleEvaluation = async (
    appId: string,
    customCriteria?: Array<{
      label: string;
      description?: string;
      weight?: string;
    }>,
  ) => {
    setRetryingId(appId);
    try {
      const body: Record<string, unknown> = { applicationIds: [appId] };
      if (customCriteria && customCriteria.length > 0) {
        body.customCriteria = customCriteria;
      }
      await fetch("/api/admin/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTimeout(() => fetchEvaluations(), 3000);
    } catch {
      toast.error("Değerlendirme başlatılamadı");
    }
    setRetryingId(null);
  };

  // ─── Session & Group Helpers ───

  const fetchCandidateGroups = async () => {
    try {
      const res = await fetch("/api/admin/candidate-groups");
      const json = await res.json();
      if (json.success) setCandidateGroups(json.data);
    } catch {
      /* silent */
    }
  };

  const createSessionAndEvaluate = async () => {
    setCreatingSession(true);
    try {
      // 1. Oturum oluştur
      const sRes = await fetch("/api/admin/evaluation-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: sessionLabel.trim() || null,
          description: sessionDesc.trim() || null,
        }),
      });
      const sJson = await sRes.json();
      if (!sJson.success) {
        toast.error(sJson.error || "Oturum oluşturulamadı");
        setCreatingSession(false);
        return;
      }

      const sessionId = sJson.data.id;
      toast.success(
        `Değerlendirme oturumu oluşturuldu${sessionLabel.trim() ? `: ${sessionLabel.trim()}` : ""}`,
      );

      // 2. Batch değerlendirme başlat (sessionId ile)
      const pendingApps = evalApps.filter(
        (a) => !a.evaluation || a.evaluation.status === "failed",
      );
      const body: Record<string, unknown> = preFilterActive
        ? { applicationIds: pendingApps.map((a) => a.id), sessionId }
        : {
            onlyNew: evalFilter === "pending",
            sessionId,
            ...(evalDeptFilter ? { departmentId: evalDeptFilter } : {}),
          };

      const res = await fetch("/api/admin/evaluations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        const queued: number = json.data.queued ?? 0;
        toast.success(
          `${queued} başvuru değerlendirmeye alındı (Oturum: ${sessionLabel.trim() || sessionId})`,
          { duration: 7000 },
        );
        if (queued > 0) setPendingBatchNotify(true);
        else setTimeout(() => fetchEvaluations(), 5000);
      }

      setShowSessionModal(false);
      setSessionLabel("");
      setSessionDesc("");
    } catch {
      toast.error("Değerlendirme başlatılamadı");
    }
    setCreatingSession(false);
  };

  const openAddToGroup = (appId: string, evalId?: string) => {
    setAddToGroupAppId(appId);
    setAddToGroupEvalId(evalId || null);
    setSelectedGroupId("");
    fetchCandidateGroups();
    setShowAddToGroup(true);
  };

  const addToGroup = async () => {
    if (!selectedGroupId || !addToGroupAppId) return;
    setAddingToGroup(true);
    try {
      const res = await fetch(
        `/api/admin/candidate-groups/${selectedGroupId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId: addToGroupAppId,
            evaluationId: addToGroupEvalId || undefined,
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        const errors = json.data?.errors || [];
        if (errors.length > 0) {
          toast.warning(errors[0].error);
        } else {
          toast.success("Aday gruba eklendi");
        }
        setShowAddToGroup(false);
      } else {
        toast.error(json.error || "Gruba eklenemedi");
      }
    } catch {
      toast.error("Gruba eklenemedi");
    }
    setAddingToGroup(false);
  };

  // ─── AI Action Handler ───

  const handleAiAction = async (action: EvalAction) => {
    switch (action.type) {
      case "PRE_FILTER": {
        const payload = action.payload as
          | {
              criteria?: Array<{
                fieldName: string;
                operator: string;
                value: string;
              }>;
              positionId?: string;
            }
          | undefined;
        if (payload?.criteria) {
          await runPreFilterFromAI(
            payload.criteria,
            payload.positionId ?? undefined,
          );
        }
        break;
      }
      case "DEPT_FILTER": {
        const deptPayload = action.payload as
          | { departmentName?: string; departmentId?: string }
          | undefined;
        if (deptPayload) {
          let deptId = deptPayload.departmentId || "";
          if (!deptId && deptPayload.departmentName) {
            const found = departments.find(
              (d) =>
                d.name.toLowerCase() ===
                deptPayload.departmentName!.toLowerCase(),
            );
            if (!found) {
              const partial = departments.find((d) =>
                d.name
                  .toLowerCase()
                  .includes(deptPayload.departmentName!.toLowerCase()),
              );
              deptId = partial?.id || "";
            } else {
              deptId = found.id;
            }
          }
          if (deptId) {
            setPreFilterActive(false);
            setEvalDeptFilter(deptId);
            toast.success(
              `${departments.find((d) => d.id === deptId)?.name || "Departman"} filtresi uygulandı`,
            );
          } else {
            toast.error("Departman bulunamadı");
          }
        }
        break;
      }
      case "BATCH_EVALUATE": {
        const batchPayload = action.payload as
          | {
              customCriteria?: Array<{
                label: string;
                description?: string;
                weight?: string;
              }>;
            }
          | undefined;
        await runBatchEvaluation(batchPayload?.customCriteria);
        break;
      }
      case "SINGLE_EVALUATE": {
        const p = action.payload as
          | {
              applicationId?: string;
              customCriteria?: Array<{
                label: string;
                description?: string;
                weight?: string;
              }>;
            }
          | undefined;
        if (p?.applicationId)
          await runSingleEvaluation(p.applicationId, p?.customCriteria);
        break;
      }
      case "CLEAR_FILTER":
        setEvalDeptFilter("");
        clearPreFilter();
        break;
      case "REFRESH_DATA":
        await fetchEvaluations();
        toast.success("Veriler güncellendi");
        break;
      case "UPDATE_STATUS": {
        const statusPayload = action.payload as
          | { applicationId?: string; status?: string }
          | undefined;
        if (statusPayload?.applicationId && statusPayload?.status) {
          try {
            const res = await fetch(
              `/api/admin/applications/${statusPayload.applicationId}/status`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: statusPayload.status }),
              },
            );
            const json = await res.json();
            if (json.success) {
              toast.success(
                `Başvuru durumu "${statusPayload.status}" olarak güncellendi`,
              );
              await fetchEvaluations();
            } else {
              toast.error(json.error || "Durum güncellenemedi");
            }
          } catch {
            toast.error("Durum güncellenirken hata oluştu");
          }
        }
        break;
      }
    }
  };

  const pendingCount = evalApps.filter(
    (a) =>
      !a.evaluation ||
      a.evaluation.status === "pending" ||
      a.evaluation.status === "failed",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AppLoader size="lg" variant="spinner" text="Yükleniyor..." />
      </div>
    );
  }

  // ─── RENDER ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-mr-navy">
          Başvuru Değerlendirme
        </h1>
        <p className="text-sm text-mr-text-secondary mt-1">
          AI asistan ile konuşarak adayları filtreleyin ve değerlendirin
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            if (!preFilterActive) setEvalFilter("all");
          }}
        >
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-mr-navy">
              {evalStats.total}
            </div>
            <div className="text-xs text-mr-text-secondary">
              {preFilterActive ? "Filtrelenen" : "Toplam"} Başvuru
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            if (!preFilterActive) setEvalFilter("pending");
          }}
        >
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-amber-600">
              {evalStats.pending}
            </div>
            <div className="text-xs text-mr-text-secondary">
              Değerlendirilmemiş
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            if (!preFilterActive) setEvalFilter("completed");
          }}
        >
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-emerald-600">
              {evalStats.evaluated}
            </div>
            <div className="text-xs text-mr-text-secondary">
              Değerlendirilmiş
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            if (!preFilterActive) setEvalFilter("failed");
          }}
        >
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-red-600">
              {evalStats.failed}
            </div>
            <div className="text-xs text-mr-text-secondary">Başarısız</div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ FİLTRE & EYLEMLER ═══ */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            {!preFilterActive && (
              <>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                  value={evalDeptFilter}
                  onChange={(e) => setEvalDeptFilter(e.target.value)}
                  aria-label="Departman filtresi"
                >
                  <option value="">Tüm Departmanlar</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                  value={evalFilter}
                  onChange={(e) => setEvalFilter(e.target.value)}
                  aria-label="Değerlendirme durumu filtresi"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Değerlendirilmemiş</option>
                  <option value="completed">Değerlendirilmiş</option>
                  <option value="failed">Başarısız</option>
                </select>
              </>
            )}

            {preFilterActive && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-700 font-medium">
                  🎯 AI filtresi aktif — {evalApps.length} aday
                </span>
                <Button variant="outline" size="sm" onClick={clearPreFilter}>
                  Filtreyi Kaldır
                </Button>
              </div>
            )}

            <div className="flex-1" />

            <Button
              onClick={() =>
                preFilterActive ? clearPreFilter() : fetchEvaluations()
              }
              variant="outline"
              size="sm"
              disabled={evalLoading}
            >
              {evalLoading ? "Yükleniyor..." : "Yenile"}
            </Button>

            <Button
              onClick={() => runBatchEvaluation()}
              disabled={batchRunning || pendingCount === 0}
              className="bg-mr-gold hover:bg-mr-gold-dark text-white"
              size="sm"
            >
              {batchRunning
                ? "Başlatılıyor..."
                : `🤖 Toplu Değerlendir (${pendingCount})`}
            </Button>

            <Button
              onClick={() => setShowSessionModal(true)}
              disabled={pendingCount === 0}
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              size="sm"
            >
              📋 Yeni Değerlendirme Oluştur
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ ADAY LİSTESİ ═══ */}
      {evalLoading && !preFilterActive ? (
        <div className="flex items-center gap-2 py-4">
          <AppLoader size="sm" variant="spinner" text="Yükleniyor..." />
        </div>
      ) : evalApps.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-mr-text-secondary">
              {preFilterActive
                ? "Bu kriterlere uygun aday bulunamadı."
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
                  onClick={() => setExpandedEval(isExpanded ? null : app.id)}
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
                      <span className="inline-block px-2 py-1 rounded-md text-xs bg-gray-50 text-gray-600 border border-gray-200">
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
                      <span className="text-xs text-mr-text-secondary">
                        #{app.applicationNo}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-mr-text-secondary mt-0.5">
                      <span>
                        {app.department?.name || app.positionTitle || "—"}
                      </span>
                      <span>
                        {new Date(app.submittedAt).toLocaleDateString("tr-TR")}
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
                    className={`shrink-0 text-mr-text-secondary transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Expanded Detail */}
                {isExpanded && ev?.status === "completed" && report && (
                  <div className="border-t px-4 py-4 bg-mr-bg-secondary/30 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs font-medium text-mr-text-secondary mb-1">
                          Genel Puan
                        </div>
                        <div
                          className={`text-3xl font-bold ${ev.overallScore >= 75 ? "text-emerald-600" : ev.overallScore >= 50 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {ev.overallScore}
                          <span className="text-sm font-normal text-mr-text-secondary">
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
                      <div className="md:col-span-2">
                        {report.summary && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-mr-text-secondary mb-1">
                              Özet
                            </div>
                            <p className="text-sm text-mr-text-primary">
                              {report.summary}
                            </p>
                          </div>
                        )}
                        {report.fitAnalysis && (
                          <div>
                            <div className="text-xs font-medium text-mr-text-secondary mb-1">
                              Pozisyon Uyumu
                            </div>
                            <p className="text-sm text-mr-text-primary">
                              {report.fitAnalysis}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.strengths && report.strengths.length > 0 && (
                        <div className="bg-emerald-50 rounded-md p-3">
                          <div className="text-xs font-medium text-emerald-700 mb-1">
                            💪 Güçlü Yönler
                          </div>
                          <ul className="text-sm text-emerald-800 space-y-0.5">
                            {report.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-emerald-500 mt-0.5">
                                  •
                                </span>{" "}
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.weaknesses && report.weaknesses.length > 0 && (
                        <div className="bg-red-50 rounded-md p-3">
                          <div className="text-xs font-medium text-red-700 mb-1">
                            ⚠️ Zayıf Yönler / Riskler
                          </div>
                          <ul className="text-sm text-red-800 space-y-0.5">
                            {report.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-500 mt-0.5">•</span>{" "}
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {report.recommendationReason && (
                      <div className="text-xs text-mr-text-secondary italic">
                        Gerekçe: {report.recommendationReason}
                      </div>
                    )}
                    {ev.evaluatedAt && (
                      <div className="text-xs text-mr-text-secondary">
                        Değerlendirilme:{" "}
                        {new Date(ev.evaluatedAt).toLocaleString("tr-TR")}
                      </div>
                    )}

                    {/* Gruba Ekle Butonu */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => openAddToGroup(app.id, ev.id)}
                      >
                        📁 Gruba Ekle
                      </Button>
                    </div>

                    {/* Kullanılan Kriterler */}
                    {ev.customCriteria &&
                      Array.isArray(ev.customCriteria) &&
                      ev.customCriteria.length > 0 && (
                        <div className="bg-blue-50 rounded-md p-3">
                          <div className="text-xs font-medium text-blue-700 mb-1">
                            📋 Kullanılan Kriterler
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              ev.customCriteria as Array<{
                                label: string;
                                weight?: string;
                              }>
                            ).map((c, i) => (
                              <span
                                key={i}
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                  c.weight === "high"
                                    ? "bg-red-100 text-red-700"
                                    : c.weight === "low"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {c.label} (
                                {c.weight === "high"
                                  ? "Yüksek"
                                  : c.weight === "low"
                                    ? "Düşük"
                                    : "Orta"}
                                )
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Değerlendirme Geçmişi */}
                    {app.evaluationHistory &&
                      app.evaluationHistory.length > 1 && (
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="text-xs font-medium text-gray-700 mb-2">
                            📜 Değerlendirme Geçmişi (
                            {app.evaluationHistory.length} kayıt)
                          </div>
                          <div className="space-y-1.5">
                            {app.evaluationHistory.map((hist, idx) => {
                              const histReport = hist.report as
                                | EvalReport
                                | undefined;
                              return (
                                <div
                                  key={hist.id}
                                  className={`flex items-center gap-3 text-xs px-2 py-1.5 rounded ${idx === 0 ? "bg-white border border-emerald-200" : "bg-white/60 border border-gray-200"}`}
                                >
                                  <span
                                    className={`font-bold w-8 text-center ${
                                      hist.overallScore >= 75
                                        ? "text-emerald-600"
                                        : hist.overallScore >= 50
                                          ? "text-amber-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {hist.status === "completed"
                                      ? hist.overallScore
                                      : "—"}
                                  </span>
                                  <span className="text-gray-600 flex-1 truncate">
                                    {hist.evaluationLabel || "Standart"}
                                  </span>
                                  {histReport?.recommendation && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${recLabel(histReport.recommendation).cls}`}
                                    >
                                      {recLabel(histReport.recommendation).text}
                                    </span>
                                  )}
                                  <span className="text-gray-600 shrink-0">
                                    {hist.createdAt
                                      ? new Date(
                                          hist.createdAt,
                                        ).toLocaleDateString("tr-TR")
                                      : "—"}
                                  </span>
                                  {idx === 0 && (
                                    <span className="text-[10px] text-emerald-600 font-medium">
                                      Son
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {isExpanded && (!ev || ev.status !== "completed") && (
                  <div className="border-t px-4 py-4 bg-mr-bg-secondary/30">
                    <p className="text-sm text-mr-text-secondary">
                      {!ev
                        ? 'Bu başvuru henüz AI tarafından değerlendirilmedi. "Değerlendir" butonuna tıklayarak veya AI asistana söyleyerek başlatabilirsiniz.'
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

      {/* ═══ AI ASISTAN ═══ */}
      <EvaluationAiAssistant
        fieldDefs={fieldDefs}
        stats={evalStats}
        filteredCount={evalApps.length}
        preFilterActive={preFilterActive}
        departments={departments}
        onAction={handleAiAction}
      />

      {/* Toplu Değerlendirme E-posta Bildirim Dialogu */}
      <Dialog
        open={showBatchEmailDialog}
        onOpenChange={(open) => {
          if (!open) setShowBatchEmailDialog(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Toplu E-posta Bildirimi</DialogTitle>
            <DialogDescription>
              Tüm değerlendirmeler tamamlandı.{" "}
              <strong>{batchCompletedApps.length}</strong> adaya
              &ldquo;Başvurunuz Değerlendirildi&rdquo; e-postası gönderilsin mi?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBatchEmailDialog(false)}
              disabled={sendingBatchEmail}
            >
              Geç
            </Button>
            <Button
              disabled={sendingBatchEmail}
              className="bg-mr-navy hover:bg-mr-navy/90"
              onClick={async () => {
                setSendingBatchEmail(true);
                try {
                  const res = await fetch(
                    "/api/admin/evaluations/batch-notify",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        applicationIds: batchCompletedApps,
                      }),
                    },
                  );
                  const json = await res.json();
                  if (json.success) {
                    toast.success(
                      `${json.sent} adaya e-posta gönderildi${json.failed > 0 ? `, ${json.failed} gönderilemedi` : ""}`,
                    );
                  } else {
                    toast.error("E-postalar gönderilemedi");
                  }
                } catch {
                  toast.error("Bağlantı hatası");
                } finally {
                  setSendingBatchEmail(false);
                  setShowBatchEmailDialog(false);
                }
              }}
            >
              {sendingBatchEmail
                ? "Gönderiliyor..."
                : `${batchCompletedApps.length} Adaya Gönder`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Yeni Değerlendirme Oluştur Dialog ═══ */}
      <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Değerlendirme Oluştur</DialogTitle>
            <DialogDescription>
              Değerlendirme oturumu oluşturun. Tüm sonuçlar bu oturum altında
              kaydedilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Değerlendirme Adı (opsiyonel)
              </label>
              <Input
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
                placeholder="Örn: Mutfak Ekibi - Mart 2026"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Açıklama (opsiyonel)
              </label>
              <Textarea
                value={sessionDesc}
                onChange={(e) => setSessionDesc(e.target.value)}
                placeholder="Bu değerlendirme hakkında kısa not..."
                rows={3}
              />
            </div>
            <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-700">
              📋 {pendingCount} aday değerlendirmeye alınacak. Sonuçlar,
              kriterler ve puanlar bu oturum altında saklanacak.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSessionModal(false)}
              disabled={creatingSession}
            >
              İptal
            </Button>
            <Button
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              onClick={createSessionAndEvaluate}
              disabled={creatingSession || pendingCount === 0}
            >
              {creatingSession ? "Oluşturuluyor..." : "Oluştur ve Değerlendir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Gruba Ekle Dialog ═══ */}
      <Dialog open={showAddToGroup} onOpenChange={setShowAddToGroup}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adayı Gruba Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Grup Seçin
              </label>
              {candidateGroups.length === 0 ? (
                <p className="text-sm text-mr-text-secondary">
                  Henüz grup yok.{" "}
                  <a
                    href="/admin/aday-gruplari"
                    className="text-mr-navy underline"
                  >
                    Grup oluşturun
                  </a>
                </p>
              ) : (
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  aria-label="Grup seçimi"
                >
                  <option value="">Grup seçin...</option>
                  {candidateGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} aday)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddToGroup(false)}
              disabled={addingToGroup}
            >
              İptal
            </Button>
            <Button
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              onClick={addToGroup}
              disabled={addingToGroup || !selectedGroupId}
            >
              {addingToGroup ? "Ekleniyor..." : "Gruba Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
