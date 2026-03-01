"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AppLoader } from "@/components/shared/AppLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  exportToPDF,
  exportToExcel,
  printEvaluation,
  exportListToPDF,
  exportListToExcel,
  printListEvaluation,
} from "@/lib/export-utils";
import type { ListExportItem } from "@/lib/export-utils";
import { EvaluationAiAssistant } from "@/components/admin/evaluation/EvaluationAiAssistant";

// ─── Types ───

interface EvalReport {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
  recommendationReason?: string;
  fitAnalysis?: string;
  overallScore?: number;
}

interface SessionCandidate {
  evaluationId: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  applicationNo: string;
  positionTitle: string;
  department: string;
  submittedAt: string;
  applicationStatus: string;
  overallScore: number;
  evaluationStatus: string;
  report: EvalReport | null;
  evaluatedAt: string | null;
  customCriteria: unknown;
  evaluationLabel: string | null;
  manualNote: string | null;
  finalDecision: string | null;
  groups: Array<{ groupId: string; groupName: string; membershipId: string }>;
}

interface SessionDetail {
  id: string;
  label: string | null;
  description: string | null;
  criteria: unknown;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; fullName: string; username: string } | null;
  stats: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    avgScore: number;
  };
  recommendations: {
    shortlist: number;
    interview: number;
    consider: number;
    reject: number;
  };
}

interface CandidateGroup {
  id: string;
  name: string;
  memberCount: number;
}

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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: {
    label: "Aktif",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  draft: { label: "Taslak", cls: "bg-gray-50 text-gray-600 border-gray-200" },
  screening: {
    label: "Eleme",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  evaluating: {
    label: "Değerlendirme",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Tamamlandı",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  archived: { label: "Arşiv", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function recLabel(rec: string): { text: string; cls: string } {
  switch (rec) {
    case "shortlist":
      return { text: "Kısa Liste", cls: "bg-emerald-100 text-emerald-800" };
    case "interview":
      return { text: "Mülakata Çağır", cls: "bg-blue-100 text-blue-800" };
    case "consider":
      return { text: "Değerlendir", cls: "bg-amber-100 text-amber-800" };
    case "reject":
      return { text: "Uygun Değil", cls: "bg-red-100 text-red-800" };
    default:
      return { text: rec, cls: "bg-gray-100 text-gray-700" };
  }
}

// ─── Final Decision Options ───
const FINAL_DECISIONS = [
  {
    value: "hired",
    label: "İşe Alındı",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    value: "interview",
    label: "Mülakata Çağrıldı",
    cls: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "pending",
    label: "Beklemede",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "rejected",
    label: "Reddedildi",
    cls: "bg-red-100 text-red-800 border-red-200",
  },
  {
    value: "reserve",
    label: "Yedek Liste",
    cls: "bg-purple-100 text-purple-800 border-purple-200",
  },
];

function decisionLabel(
  val: string | null,
): { label: string; cls: string } | null {
  if (!val) return null;
  const found = FINAL_DECISIONS.find((d) => d.value === val);
  return found
    ? { label: found.label, cls: found.cls }
    : { label: val, cls: "bg-gray-100 text-gray-700 border-gray-200" };
}

// ─── Default Groups ───
const DEFAULT_GROUPS = [
  "Uygun Olanlar",
  "Uygun Olmayanlar",
  "Yeniden Görüşülecekler",
  "Görüşmeye Çağırılacaklar",
];

// ─── Component ───

export default function EvaluationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Session data
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [candidates, setCandidates] = useState<SessionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Departments & field defs for pre-screening
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([]);
  const [preFilterActive, setPreFilterActive] = useState(false);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRec, setFilterRec] = useState("all"); // recommendation filter

  // Add candidates modal
  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [addDeptFilter, setAddDeptFilter] = useState("");
  const [addingCandidates, setAddingCandidates] = useState(false);

  // Group assignment modal
  const [showGroupAssign, setShowGroupAssign] = useState(false);
  const [candidateGroups, setCandidateGroups] = useState<CandidateGroup[]>([]);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignNewGroup, setAssignNewGroup] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Export modal
  const [showExport, setShowExport] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "selected" | "group">(
    "all",
  );
  const [exportGroupFilter, setExportGroupFilter] = useState("");
  const [exportMode, setExportMode] = useState<"list" | "detail">("list");

  // Edit session modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // AI evaluation
  const [evaluating, setEvaluating] = useState(false);

  // Pre-evaluation dialog
  const [showPreEval, setShowPreEval] = useState(false);
  const [preEvalMode, setPreEvalMode] = useState<"standard" | "custom">(
    "standard",
  );
  const [customCriteria, setCustomCriteria] = useState<
    Array<{
      label: string;
      description: string;
      weight: "high" | "medium" | "low";
    }>
  >([]);
  const [customPrompt, setCustomPrompt] = useState("");

  // Progress bar dialog
  const [showProgress, setShowProgress] = useState(false);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressCompleted, setProgressCompleted] = useState(0);
  const [progressFailed, setProgressFailed] = useState(0);
  const [progressStartTime, setProgressStartTime] = useState<number>(0);

  // Manual note / final decision
  const [noteText, setNoteText] = useState("");
  const [noteDecision, setNoteDecision] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showBulkNote, setShowBulkNote] = useState(false);
  const [bulkNoteText, setBulkNoteText] = useState("");
  const [bulkDecision, setBulkDecision] = useState("");

  // ─── Fetch ───

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/evaluation-sessions/${sessionId}`);
      const json = await res.json();
      if (json.success) setSession(json.data);
      else toast.error("Oturum bulunamadı");
    } catch {
      toast.error("Oturum yüklenemedi");
    }
  }, [sessionId]);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/evaluation-sessions/${sessionId}/candidates`,
      );
      const json = await res.json();
      if (json.success) setCandidates(json.data);
    } catch {
      toast.error("Adaylar yüklenemedi");
    }
  }, [sessionId]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/admin/candidate-groups");
      const json = await res.json();
      if (json.success) setCandidateGroups(json.data);
    } catch {
      /* silent */
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/admin/applications/stats");
      const json = await res.json();
      if (json.success && json.data?.departmentDistribution) {
        setDepartments(
          json.data.departmentDistribution.map(
            (d: { departmentId: string; departmentName: string }) => ({
              id: d.departmentId,
              name: d.departmentName,
            }),
          ),
        );
      }
    } catch {
      /* silent */
    }
  };

  const fetchFieldDefs = async () => {
    try {
      const res = await fetch("/api/admin/evaluations/pre-filter");
      const json = await res.json();
      if (json.success) setFieldDefs(json.data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchSession(),
        fetchCandidates(),
        fetchDepartments(),
        fetchFieldDefs(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchSession, fetchCandidates]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSession(), fetchCandidates()]);
    setRefreshing(false);
  };

  // ─── Polling for pending evaluations ───

  // Pre-fill note/decision when detail dialog opens
  useEffect(() => {
    if (expandedId) {
      const c = candidates.find((x) => x.applicationId === expandedId);
      if (c) {
        setNoteText(c.manualNote || "");
        setNoteDecision(c.finalDecision || "");
      }
    }
  }, [expandedId, candidates]);

  useEffect(() => {
    const hasPending = candidates.some((c) => c.evaluationStatus === "pending");
    if (!hasPending) return;
    const controller = new AbortController();
    const interval = setInterval(async () => {
      if (controller.signal.aborted) return;
      await Promise.all([fetchSession(), fetchCandidates()]);
    }, 6000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [candidates, fetchSession, fetchCandidates]);

  // ─── Filtered candidates ───

  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (filterStatus !== "all") {
      list = list.filter((c) => c.evaluationStatus === filterStatus);
    }
    if (filterRec !== "all") {
      list = list.filter((c) => c.report?.recommendation === filterRec);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.applicationNo.includes(q) ||
          c.department.toLowerCase().includes(q),
      );
    }
    // Puana göre azalan sıralama (completed olanlar üstte, sonra pending, sonra failed)
    list = [...list].sort((a, b) => {
      // Completed olanlar önce
      const statusOrder = { completed: 0, pending: 1, failed: 2 };
      const aOrder =
        statusOrder[a.evaluationStatus as keyof typeof statusOrder] ?? 3;
      const bOrder =
        statusOrder[b.evaluationStatus as keyof typeof statusOrder] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Aynı status ise puana göre azalan
      return b.overallScore - a.overallScore;
    });
    return list;
  }, [candidates, filterStatus, filterRec, searchQuery]);

  const completedCandidates = useMemo(
    () => candidates.filter((c) => c.evaluationStatus === "completed"),
    [candidates],
  );

  // Recommendation counts for badge filter buttons
  const recCounts = useMemo(() => {
    const counts = { shortlist: 0, interview: 0, consider: 0, reject: 0 };
    for (const c of candidates) {
      const rec = c.report?.recommendation as keyof typeof counts;
      if (rec && rec in counts) counts[rec]++;
    }
    return counts;
  }, [candidates]);

  // ─── Selection ───

  const toggleSelect = (appId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map((c) => c.applicationId)));
    }
  };

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selectedIds.has(c.applicationId)),
    [candidates, selectedIds],
  );

  // ─── Actions ───

  const addCandidatesToSession = async () => {
    setAddingCandidates(true);
    try {
      // Fetch all applications (optionally filtered by dept)
      const params = new URLSearchParams();
      if (addDeptFilter) params.set("departmentId", addDeptFilter);
      params.set("filter", "pending"); // only unevaluated
      const res = await fetch(`/api/admin/evaluations?${params}`);
      const json = await res.json();
      if (!json.success) {
        toast.error("Adaylar alınamadı");
        setAddingCandidates(false);
        return;
      }

      const appIds = (json.data.applications as Array<{ id: string }>).map(
        (a) => a.id,
      );
      if (appIds.length === 0) {
        toast.warning("Değerlendirilecek aday bulunamadı");
        setAddingCandidates(false);
        return;
      }

      // Add candidates to session WITHOUT triggering evaluation
      const addRes = await fetch(
        `/api/admin/evaluation-sessions/${sessionId}/candidates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationIds: appIds,
            skipEvaluation: true,
          }),
        },
      );
      const addJson = await addRes.json();
      if (addJson.success) {
        toast.success(`${addJson.data.queued} aday oturuma eklendi`);
        setShowAddCandidates(false);
        await Promise.all([fetchSession(), fetchCandidates()]);
      }
    } catch {
      toast.error("Aday ekleme hatası");
    }
    setAddingCandidates(false);
  };

  // ─── Save Manual Note / Final Decision ───

  const saveNote = async (
    evaluationIds: string[],
    note?: string,
    decision?: string,
  ) => {
    setSavingNote(true);
    try {
      const body: Record<string, unknown> = { evaluationIds };
      if (note !== undefined) body.manualNote = note;
      if (decision !== undefined) body.finalDecision = decision;

      const res = await fetch("/api/admin/evaluations/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.data.updated} aday güncellendi`);
        await fetchCandidates();
      } else {
        toast.error(json.error || "Kaydetme hatası");
      }
    } catch {
      toast.error("Kaydetme hatası");
    }
    setSavingNote(false);
  };

  // ─── AI Assistant Action Handler ───

  const handleAiAction = useCallback(
    async (action: { type: string; payload?: Record<string, unknown> }) => {
      switch (action.type) {
        case "PRE_FILTER": {
          // AI suggested pre-filter criteria — apply to session
          const criteria = (action.payload as { criteria?: unknown[] })
            ?.criteria;
          if (criteria && Array.isArray(criteria)) {
            try {
              const res = await fetch(
                `/api/admin/evaluation-sessions/${sessionId}`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ criteria }),
                },
              );
              const json = await res.json();
              if (json.success) {
                toast.success("Ön eleme kriterleri kaydedildi");
                setPreFilterActive(true);
                fetchSession();
              }
            } catch {
              toast.error("Kriterler kaydedilemedi");
            }
          }
          break;
        }
        case "BATCH_EVALUATE":
          runAiEvaluation();
          break;
        case "REFRESH_DATA":
          refresh();
          break;
        case "CLEAR_FILTER":
          setPreFilterActive(false);
          setFilterStatus("all");
          setSearchQuery("");
          break;
        case "DEPT_FILTER": {
          const deptName = (action.payload as { departmentName?: string })
            ?.departmentName;
          if (deptName) {
            setSearchQuery(deptName);
          }
          break;
        }
        default:
          break;
      }
    },
    [sessionId, fetchSession],
  );

  // Open pre-eval dialog instead of directly evaluating
  const openPreEvalDialog = () => {
    const pendingIds = candidates
      .filter((c) => c.evaluationStatus !== "completed")
      .map((c) => c.applicationId);
    if (pendingIds.length === 0) {
      toast.warning("Tüm adaylar zaten değerlendirilmiş");
      return;
    }
    setPreEvalMode("standard");
    setCustomCriteria([]);
    setCustomPrompt("");
    setShowPreEval(true);
  };

  const addCriterion = () => {
    setCustomCriteria((prev) => [
      ...prev,
      { label: "", description: "", weight: "medium" },
    ]);
  };

  const removeCriterion = (idx: number) => {
    setCustomCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, field: string, value: string) => {
    setCustomCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  // Start evaluation with optional criteria
  const startEvaluation = async () => {
    const pendingIds = candidates
      .filter((c) => c.evaluationStatus !== "completed")
      .map((c) => c.applicationId);

    if (pendingIds.length === 0) return;

    setShowPreEval(false);
    setEvaluating(true);

    // Build criteria payload
    const criteria =
      preEvalMode === "custom"
        ? [
            ...customCriteria.filter((c) => c.label.trim()),
            ...(customPrompt.trim()
              ? [
                  {
                    label: "Ek Yönlendirme",
                    description: customPrompt.trim(),
                    weight: "medium" as const,
                  },
                ]
              : []),
          ]
        : undefined;

    try {
      const res = await fetch(
        `/api/admin/evaluation-sessions/${sessionId}/candidates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationIds: pendingIds,
            customCriteria:
              criteria && criteria.length > 0 ? criteria : undefined,
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        // Show progress dialog
        setProgressTotal(pendingIds.length);
        setProgressCompleted(0);
        setProgressFailed(0);
        setProgressStartTime(Date.now());
        setShowProgress(true);
        setEvaluating(false);
      } else {
        toast.error("AI değerlendirme başlatılamadı");
        setEvaluating(false);
      }
    } catch {
      toast.error("AI değerlendirme başlatılamadı");
      setEvaluating(false);
    }
  };

  // Legacy alias for AI assistant action handler
  const runAiEvaluation = openPreEvalDialog;

  // Progress polling
  useEffect(() => {
    if (!showProgress) return;
    const controller = new AbortController();
    const interval = setInterval(async () => {
      if (controller.signal.aborted) return;
      try {
        const [sessRes, candRes] = await Promise.all([
          fetch(`/api/admin/evaluation-sessions/${sessionId}`, {
            signal: controller.signal,
          }),
          fetch(`/api/admin/evaluation-sessions/${sessionId}/candidates`, {
            signal: controller.signal,
          }),
        ]);
        const sessJson = await sessRes.json();
        const candJson = await candRes.json();

        if (sessJson.success) setSession(sessJson.data);
        if (candJson.success) {
          setCandidates(candJson.data);
          const completed = (candJson.data as SessionCandidate[]).filter(
            (c) => c.evaluationStatus === "completed",
          ).length;
          const failed = (candJson.data as SessionCandidate[]).filter(
            (c) => c.evaluationStatus === "failed",
          ).length;
          const totalDone = completed + failed;
          setProgressCompleted(completed);
          setProgressFailed(failed);

          // Auto-close when all done
          if (totalDone >= progressTotal && progressTotal > 0) {
            setTimeout(() => {
              setShowProgress(false);
              toast.success(
                `Değerlendirme tamamlandı: ${completed} başarılı${failed > 0 ? `, ${failed} başarısız` : ""}`,
              );
            }, 1500);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        /* silent */
      }
    }, 3000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [showProgress, sessionId, progressTotal]);

  const updateSession = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/evaluation-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel.trim() || null,
          description: editDesc.trim() || null,
          status: editStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Değerlendirme güncellendi");
        setShowEdit(false);
        fetchSession();
      }
    } catch {
      toast.error("Güncelleme hatası");
    }
    setSaving(false);
  };

  // ─── Group Assignment ───

  const openGroupAssign = () => {
    if (selectedIds.size === 0) {
      toast.warning("Önce aday seçin");
      return;
    }
    fetchGroups();
    setAssignGroupId("");
    setAssignNewGroup("");
    setShowGroupAssign(true);
  };

  const assignToGroup = async () => {
    setAssigning(true);
    try {
      let groupId = assignGroupId;

      // Create new group if needed
      if (assignNewGroup.trim()) {
        const res = await fetch("/api/admin/candidate-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: assignNewGroup.trim() }),
        });
        const json = await res.json();
        if (json.success) groupId = json.data.id;
        else {
          toast.error("Grup oluşturulamadı");
          setAssigning(false);
          return;
        }
      }

      if (!groupId) {
        toast.error("Grup seçin veya yeni grup adı girin");
        setAssigning(false);
        return;
      }

      const members = selectedCandidates.map((c) => ({
        applicationId: c.applicationId,
        evaluationId: c.evaluationId,
        notes:
          c.evaluationStatus === "completed"
            ? `Puan: ${c.overallScore} | ${c.report?.recommendation ? recLabel(c.report.recommendation).text : "—"}`
            : undefined,
      }));

      const res = await fetch(
        `/api/admin/candidate-groups/${groupId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members }),
        },
      );
      const json = await res.json();
      if (json.success) {
        const added = json.data.added?.length || 0;
        const errors = json.data.errors?.length || 0;
        toast.success(
          `${added} aday gruba atandı${errors > 0 ? ` (${errors} zaten grupta)` : ""}`,
        );
        setShowGroupAssign(false);
        setSelectedIds(new Set());
        fetchCandidates();
      }
    } catch {
      toast.error("Gruba atama hatası");
    }
    setAssigning(false);
  };

  // ─── Export ───

  const handleExport = (format: "pdf" | "excel" | "print") => {
    let exportList = completedCandidates;

    if (exportScope === "selected") {
      exportList = selectedCandidates.filter(
        (c) => c.evaluationStatus === "completed",
      );
    } else if (exportScope === "group" && exportGroupFilter) {
      exportList = completedCandidates.filter((c) =>
        c.groups.some((g) => g.groupId === exportGroupFilter),
      );
    }

    if (exportList.length === 0) {
      toast.warning("Dışa aktarılacak aday bulunamadı");
      return;
    }

    // ─── Liste Aktar modu ───
    if (exportMode === "list") {
      const listItems: ListExportItem[] = exportList.map((c) => ({
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        department: c.department,
        positionTitle: c.positionTitle || "—",
        overallScore: c.overallScore,
        recommendation: c.report?.recommendation || null,
        finalDecision: c.finalDecision,
        manualNote: c.manualNote,
      }));

      if (format === "pdf") exportListToPDF(listItems);
      else if (format === "excel") void exportListToExcel(listItems);
      else printListEvaluation(listItems);

      toast.success(
        `${exportList.length} aday liste olarak ${format === "pdf" ? "PDF" : format === "excel" ? "Excel" : "yazdırma"} dışa aktarıldı`,
      );
      setShowExport(false);
      return;
    }

    // ─── Detaylı Aktar modu ───
    for (const c of exportList) {
      const data = {
        candidateName: c.fullName,
        email: c.email,
        phone: c.phone,
        applicationNo: c.applicationNo,
        department: c.department,
        positionTitle: c.positionTitle || "—",
        submittedAt: c.submittedAt,
        status: c.applicationStatus,
        overallScore: c.overallScore,
        evaluatedAt: c.evaluatedAt,
        report: c.report
          ? {
              overallScore: c.overallScore,
              summary: c.report.summary || "",
              strengths: c.report.strengths || [],
              weaknesses: c.report.weaknesses || [],
              fitAnalysis: c.report.fitAnalysis || "",
              recommendation: c.report.recommendation || "",
              recommendationReason: c.report.recommendationReason || "",
            }
          : null,
      };

      if (format === "pdf") exportToPDF(data);
      else if (format === "excel") void exportToExcel(data);
      else printEvaluation(data);
    }

    toast.success(
      `${exportList.length} aday detaylı ${format === "pdf" ? "PDF" : format === "excel" ? "Excel" : "yazdırma"} olarak dışa aktarıldı`,
    );
    setShowExport(false);
  };

  // ─── Loading ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AppLoader size="lg" variant="spinner" text="Yükleniyor..." />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-mr-text-secondary">Oturum bulunamadı.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/admin/on-eleme")}
        >
          ← Değerlendirmelere Dön
        </Button>
      </div>
    );
  }

  const st = STATUS_MAP[session.status] || STATUS_MAP.active;
  const pendingCount = candidates.filter(
    (c) => c.evaluationStatus === "pending",
  ).length;

  // ─── RENDER ───

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin/on-eleme")}
            className="text-sm text-mr-text-secondary hover:text-mr-navy mb-2 inline-flex items-center gap-1"
          >
            ← Değerlendirmeler
          </button>
          <h1 className="text-2xl font-semibold text-mr-navy">
            {session.label || "İsimsiz Değerlendirme"}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}
            >
              {st.label}
            </span>
            <span className="text-xs text-mr-text-secondary">
              {new Date(session.createdAt).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            {session.createdBy && (
              <span className="text-xs text-mr-text-secondary">
                — {session.createdBy.fullName}
              </span>
            )}
          </div>
          {session.description && (
            <p className="text-sm text-mr-text-secondary mt-2">
              {session.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditLabel(session.label || "");
              setEditDesc(session.description || "");
              setEditStatus(session.status);
              setShowEdit(true);
            }}
          >
            ✏️ Düzenle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? "..." : "🔄 Yenile"}
          </Button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-mr-navy">
              {session.stats.total}
            </div>
            <div className="text-xs text-mr-text-secondary">Toplam Aday</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-emerald-600">
              {session.stats.completed}
            </div>
            <div className="text-xs text-mr-text-secondary">
              Değerlendirilmiş
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-amber-600">
              {session.stats.pending}
            </div>
            <div className="text-xs text-mr-text-secondary">Bekleyen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-blue-600">
              {session.stats.avgScore}
            </div>
            <div className="text-xs text-mr-text-secondary">Ort. Puan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-medium">
                {session.recommendations.shortlist} KL
              </span>
              <span className="text-blue-600 font-medium">
                {session.recommendations.interview} MÜ
              </span>
              <span className="text-amber-600 font-medium">
                {session.recommendations.consider} DĞ
              </span>
              <span className="text-red-600 font-medium">
                {session.recommendations.reject} RD
              </span>
            </div>
            <div className="text-xs text-mr-text-secondary mt-1">
              Öneri Dağılımı
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eylem Çubuğu + Badge Filtreler + Data Table */}
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          {/* Üst Eylem Çubuğu */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Aday ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tümü ({candidates.length})</option>
              <option value="completed">
                Değerlendirilmiş ({session.stats.completed})
              </option>
              <option value="pending">
                Bekleyen ({session.stats.pending})
              </option>
              <option value="failed">Başarısız ({session.stats.failed})</option>
            </select>

            <div className="flex-1" />

            {selectedIds.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                  onClick={openGroupAssign}
                >
                  📁 Gruba Ata ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    setBulkNoteText("");
                    setBulkDecision("");
                    setShowBulkNote(true);
                  }}
                >
                  📝 Not/Karar ({selectedIds.size})
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddCandidates(true)}
            >
              + Aday Ekle
            </Button>

            {pendingCount > 0 && (
              <Button
                size="sm"
                className="bg-mr-gold hover:bg-mr-gold-dark text-white"
                onClick={openPreEvalDialog}
                disabled={evaluating}
              >
                {evaluating
                  ? "Başlatılıyor..."
                  : `🤖 AI Değerlendir (${pendingCount})`}
              </Button>
            )}

            {completedCandidates.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  fetchGroups();
                  setShowExport(true);
                }}
              >
                📥 Dışa Aktar
              </Button>
            )}
          </div>

          {/* Badge Filter Butonları */}
          {completedCandidates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterRec("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterRec === "all"
                    ? "bg-mr-navy text-white border-mr-navy"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Hepsi ({candidates.length})
              </button>
              <button
                onClick={() =>
                  setFilterRec(filterRec === "shortlist" ? "all" : "shortlist")
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterRec === "shortlist"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                Kısa Liste ({recCounts.shortlist})
              </button>
              <button
                onClick={() =>
                  setFilterRec(filterRec === "interview" ? "all" : "interview")
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterRec === "interview"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                }`}
              >
                Mülakata Çağır ({recCounts.interview})
              </button>
              <button
                onClick={() =>
                  setFilterRec(filterRec === "consider" ? "all" : "consider")
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterRec === "consider"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                }`}
              >
                Değerlendir ({recCounts.consider})
              </button>
              <button
                onClick={() =>
                  setFilterRec(filterRec === "reject" ? "all" : "reject")
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  filterRec === "reject"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                }`}
              >
                Uygun Değil ({recCounts.reject})
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-mr-text-secondary mb-4">
              Bu değerlendirmede henüz aday yok.
            </p>
            <Button
              onClick={() => setShowAddCandidates(true)}
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
            >
              Aday Ekle
            </Button>
          </CardContent>
        </Card>
      ) : filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-mr-text-secondary">
              Bu filtreye uygun aday bulunamadı.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-mr-bg-secondary/50">
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredCandidates.length &&
                        filteredCandidates.length > 0
                      }
                      onChange={selectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-center w-16 text-xs font-medium text-mr-text-secondary">
                    Puan
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-mr-text-secondary">
                    Aday
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-mr-text-secondary hidden md:table-cell">
                    Departman
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-mr-text-secondary hidden lg:table-cell">
                    Pozisyon
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-mr-text-secondary">
                    Öneri
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-mr-text-secondary hidden md:table-cell">
                    Grup
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-mr-text-secondary hidden lg:table-cell">
                    Karar
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-mr-text-secondary w-20">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => {
                  const isSelected = selectedIds.has(c.applicationId);
                  const report = c.report;

                  return (
                    <tr
                      key={c.evaluationId}
                      className={`border-b last:border-b-0 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-purple-50"
                          : "hover:bg-mr-bg-secondary/30"
                      }`}
                      onClick={() => setExpandedId(c.applicationId)}
                    >
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.applicationId)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {c.evaluationStatus === "completed" ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold border ${scoreColor(c.overallScore)}`}
                          >
                            {c.overallScore}
                          </span>
                        ) : c.evaluationStatus === "pending" ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                            ⏳
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs bg-red-50 text-red-600 border border-red-200">
                            ✕
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-mr-navy truncate max-w-[200px]">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] text-mr-text-secondary">
                          #{c.applicationNo}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-mr-text-secondary hidden md:table-cell">
                        {c.department}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-mr-text-secondary hidden lg:table-cell">
                        {c.positionTitle || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {report?.recommendation ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${recLabel(report.recommendation).cls}`}
                          >
                            {recLabel(report.recommendation).text}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center hidden md:table-cell">
                        {c.groups.length > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 truncate max-w-[120px]">
                            📁 {c.groups.map((g) => g.groupName).join(", ")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                        {(() => {
                          const dl = decisionLabel(c.finalDecision);
                          return dl ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${dl.cls}`}
                            >
                              {dl.label}
                            </span>
                          ) : c.manualNote ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200"
                              title={c.manualNote}
                            >
                              📝 Not var
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          );
                        })()}
                      </td>
                      <td
                        className="px-3 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2"
                          onClick={() =>
                            router.push(`/admin/basvurular/${c.applicationId}`)
                          }
                        >
                          👤
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablo Altı Bilgi */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-mr-text-secondary">
            <span>
              {filteredCandidates.length} aday listeleniyor
              {selectedIds.size > 0 && ` · ${selectedIds.size} seçili`}
            </span>
            {completedCandidates.length > 0 && (
              <span>Ort. Puan: {session.stats.avgScore}</span>
            )}
          </div>
        </Card>
      )}

      {/* ═══ Aday Detay Dialog ═══ */}
      <Dialog
        open={!!expandedId}
        onOpenChange={(open) => {
          if (!open) setExpandedId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {(() => {
            const c = candidates.find((x) => x.applicationId === expandedId);
            if (!c) return null;
            const report = c.report;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>{c.fullName}</span>
                    <span className="text-sm font-normal text-mr-text-secondary">
                      #{c.applicationNo}
                    </span>
                    {c.evaluationStatus === "completed" &&
                      report?.recommendation && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${recLabel(report.recommendation).cls}`}
                        >
                          {recLabel(report.recommendation).text}
                        </span>
                      )}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-3 text-xs">
                    <span>{c.department}</span>
                    <span>·</span>
                    <span>{c.positionTitle || "—"}</span>
                    <span>·</span>
                    <span>{c.email}</span>
                    {c.phone && (
                      <>
                        <span>·</span>
                        <span>{c.phone}</span>
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>

                {c.evaluationStatus === "completed" && report ? (
                  <div className="space-y-4 py-2">
                    {/* Puan + Öneri */}
                    <div className="flex items-center justify-between bg-mr-bg-secondary/40 rounded-lg p-4">
                      <div>
                        <div className="text-xs font-medium text-mr-text-secondary mb-1">
                          Genel Puan
                        </div>
                        <div
                          className={`text-4xl font-bold ${c.overallScore >= 75 ? "text-emerald-600" : c.overallScore >= 50 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {c.overallScore}
                          <span className="text-base font-normal text-mr-text-secondary">
                            /100
                          </span>
                        </div>
                      </div>
                      {report.recommendation && (
                        <div className="text-right">
                          <div className="text-xs font-medium text-mr-text-secondary mb-1">
                            AI Önerisi
                          </div>
                          <span
                            className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${recLabel(report.recommendation).cls}`}
                          >
                            {recLabel(report.recommendation).text}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Özet */}
                    {report.summary && (
                      <div>
                        <div className="text-xs font-medium text-mr-text-secondary mb-1">
                          Özet
                        </div>
                        <p className="text-sm text-mr-text-primary leading-relaxed">
                          {report.summary}
                        </p>
                      </div>
                    )}

                    {/* Pozisyon Uyumu */}
                    {report.fitAnalysis && (
                      <div>
                        <div className="text-xs font-medium text-mr-text-secondary mb-1">
                          Pozisyon Uyumu
                        </div>
                        <p className="text-sm text-mr-text-primary leading-relaxed">
                          {report.fitAnalysis}
                        </p>
                      </div>
                    )}

                    {/* Güçlü / Zayıf Yönler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.strengths && report.strengths.length > 0 && (
                        <div className="bg-emerald-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-emerald-700 mb-2">
                            💪 Güçlü Yönler
                          </div>
                          <ul className="text-sm text-emerald-800 space-y-1">
                            {report.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 mt-0.5">
                                  •
                                </span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.weaknesses && report.weaknesses.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-xs font-medium text-red-700 mb-2">
                            ⚠️ Zayıf Yönler
                          </div>
                          <ul className="text-sm text-red-800 space-y-1">
                            {report.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5">•</span>
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Gerekçe */}
                    {report.recommendationReason && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-mr-text-secondary mb-1">
                          Gerekçe
                        </div>
                        <p className="text-sm text-mr-text-primary italic">
                          {report.recommendationReason}
                        </p>
                      </div>
                    )}

                    {/* Meta bilgiler */}
                    <div className="flex items-center gap-4 text-xs text-mr-text-secondary pt-1">
                      {c.evaluatedAt && (
                        <span>
                          Değerlendirilme:{" "}
                          {new Date(c.evaluatedAt).toLocaleString("tr-TR")}
                        </span>
                      )}
                      {c.groups.length > 0 && (
                        <span>
                          Gruplar: {c.groups.map((g) => g.groupName).join(", ")}
                        </span>
                      )}
                      <span>
                        Başvuru:{" "}
                        {new Date(c.submittedAt).toLocaleDateString("tr-TR")}
                      </span>
                    </div>

                    {/* ─── Manuel Not & Nihai Karar ─── */}
                    <div className="border-t pt-4 space-y-3">
                      <div className="text-xs font-medium text-mr-navy">
                        📝 Değerlendirme Notu & Nihai Karar
                      </div>
                      <div>
                        <label className="text-xs text-mr-text-secondary block mb-1">
                          Not
                        </label>
                        <Textarea
                          placeholder="Bu aday hakkında notunuzu yazın..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-mr-text-secondary block mb-1">
                          Nihai Karar
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {FINAL_DECISIONS.map((d) => (
                            <button
                              key={d.value}
                              onClick={() =>
                                setNoteDecision(
                                  noteDecision === d.value ? "" : d.value,
                                )
                              }
                              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                noteDecision === d.value
                                  ? d.cls + " ring-2 ring-offset-1 ring-current"
                                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={
                          savingNote || (!noteText.trim() && !noteDecision)
                        }
                        onClick={async () => {
                          await saveNote(
                            [c.evaluationId],
                            noteText.trim() || undefined,
                            noteDecision || undefined,
                          );
                          // Don't close dialog, just refresh
                        }}
                      >
                        {savingNote ? "Kaydediliyor..." : "💾 Kaydet"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="text-3xl mb-3">
                      {c.evaluationStatus === "pending" ? "⏳" : "❌"}
                    </div>
                    <p className="text-sm text-mr-text-secondary">
                      {c.evaluationStatus === "pending"
                        ? "Değerlendirme devam ediyor... Birkaç saniye içinde sonuç hazır olacak."
                        : "Değerlendirme başarısız oldu. AI Değerlendir butonuyla tekrar deneyebilirsiniz."}
                    </p>
                  </div>
                )}

                <DialogFooter className="flex-row gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setSelectedIds(new Set([c.applicationId]));
                      setExpandedId(null);
                      openGroupAssign();
                    }}
                  >
                    📁 Gruba Ata
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setExpandedId(null);
                      router.push(`/admin/basvurular/${c.applicationId}`);
                    }}
                  >
                    👤 Aday Detayı
                  </Button>
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(null)}
                  >
                    Kapat
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ═══ Aday Ekle Dialog ═══ */}
      <Dialog open={showAddCandidates} onOpenChange={setShowAddCandidates}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aday Ekle ve Değerlendir</DialogTitle>
            <DialogDescription>
              Henüz değerlendirilmemiş adayları bu oturuma ekleyin.
              Değerlendirmeyi daha sonra AI Değerlendir butonu ile
              başlatabilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Departman Filtresi
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={addDeptFilter}
                onChange={(e) => setAddDeptFilter(e.target.value)}
              >
                <option value="">Tüm Departmanlar</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-700">
              📋 Değerlendirilmemiş tüm adaylar bu oturuma eklenecek.
              Değerlendirmeyi daha sonra &quot;AI Değerlendir&quot; butonu ile
              başlatabilirsiniz.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddCandidates(false)}
              disabled={addingCandidates}
            >
              İptal
            </Button>
            <Button
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              onClick={addCandidatesToSession}
              disabled={addingCandidates}
            >
              {addingCandidates ? "Ekleniyor..." : "Adayları Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Gruba Ata Dialog ═══ */}
      <Dialog open={showGroupAssign} onOpenChange={setShowGroupAssign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adayları Gruba Ata</DialogTitle>
            <DialogDescription>
              {selectedIds.size} aday seçili. Mevcut bir gruba atayın veya yeni
              grup oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Quick group buttons */}
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-2">
                Hızlı Grup Seçimi
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_GROUPS.map((name) => {
                  const existing = candidateGroups.find((g) => g.name === name);
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        if (existing) {
                          setAssignGroupId(existing.id);
                          setAssignNewGroup("");
                        } else {
                          setAssignNewGroup(name);
                          setAssignGroupId("");
                        }
                      }}
                      className={`text-xs px-3 py-2 rounded-md border transition-colors ${
                        (existing && assignGroupId === existing.id) ||
                        assignNewGroup === name
                          ? "bg-purple-100 border-purple-300 text-purple-800"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {name}
                      {existing && (
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({existing.memberCount})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Existing groups dropdown */}
            {candidateGroups.length > 0 && (
              <div>
                <label className="text-sm font-medium text-mr-navy block mb-1">
                  Veya Mevcut Grup
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                  value={assignGroupId}
                  onChange={(e) => {
                    setAssignGroupId(e.target.value);
                    if (e.target.value) setAssignNewGroup("");
                  }}
                >
                  <option value="">Grup seçin...</option>
                  {candidateGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.memberCount} aday)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New group input */}
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Veya Yeni Grup Adı
              </label>
              <Input
                value={assignNewGroup}
                onChange={(e) => {
                  setAssignNewGroup(e.target.value);
                  if (e.target.value) setAssignGroupId("");
                }}
                placeholder="Yeni grup adı..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGroupAssign(false)}
              disabled={assigning}
            >
              İptal
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={assignToGroup}
              disabled={assigning || (!assignGroupId && !assignNewGroup.trim())}
            >
              {assigning
                ? "Atanıyor..."
                : `Gruba Ata (${selectedIds.size} aday)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dışa Aktar Dialog ═══ */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Değerlendirme Sonuçlarını Dışa Aktar</DialogTitle>
            <DialogDescription>
              Aktarım modunu ve kapsamı seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* ─── Aktarım Modu ─── */}
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-2">
                Aktarım Modu
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportMode("list")}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    exportMode === "list"
                      ? "border-mr-gold bg-amber-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium text-mr-navy">
                    📋 Liste Aktar
                  </div>
                  <div className="text-xs text-mr-text-secondary mt-1">
                    Tüm adaylar tek tabloda: Ad, İletişim, Puan, Öneri, Karar
                  </div>
                </button>
                <button
                  onClick={() => setExportMode("detail")}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    exportMode === "detail"
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium text-mr-navy">
                    📄 Detaylı Aktar
                  </div>
                  <div className="text-xs text-mr-text-secondary mt-1">
                    Her aday için ayrı detaylı rapor
                  </div>
                </button>
              </div>
            </div>

            {/* ─── Kapsam ─── */}
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-2">
                Kapsam
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === "all"}
                    onChange={() => setExportScope("all")}
                    className="text-mr-navy"
                  />
                  Tüm değerlendirilen adaylar ({completedCandidates.length})
                </label>
                {selectedIds.size > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === "selected"}
                      onChange={() => setExportScope("selected")}
                      className="text-mr-navy"
                    />
                    Seçili adaylar (
                    {
                      selectedCandidates.filter(
                        (c) => c.evaluationStatus === "completed",
                      ).length
                    }
                    )
                  </label>
                )}
                {candidateGroups.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === "group"}
                      onChange={() => setExportScope("group")}
                      className="text-mr-navy"
                    />
                    Belirli bir grup
                  </label>
                )}
              </div>
            </div>

            {exportScope === "group" && (
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={exportGroupFilter}
                onChange={(e) => setExportGroupFilter(e.target.value)}
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowExport(false)}>
              İptal
            </Button>
            <Button variant="outline" onClick={() => handleExport("print")}>
              🖨️ Yazdır
            </Button>
            <Button variant="outline" onClick={() => handleExport("excel")}>
              📊 Excel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleExport("pdf")}
            >
              📄 PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Ön Değerlendirme Kriterleri Dialog ═══ */}
      <Dialog open={showPreEval} onOpenChange={setShowPreEval}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>🤖 AI Değerlendirme Başlat</DialogTitle>
            <DialogDescription>
              {
                candidates.filter((c) => c.evaluationStatus !== "completed")
                  .length
              }{" "}
              aday değerlendirilecek. Ön kriter belirlemek ister misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPreEvalMode("standard")}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  preEvalMode === "standard"
                    ? "border-mr-gold bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-medium text-mr-navy">
                  ⚡ Standart Değerlendirme
                </div>
                <div className="text-xs text-mr-text-secondary mt-1">
                  Sistem kriterlerine göre otomatik değerlendir
                </div>
              </button>
              <button
                onClick={() => {
                  setPreEvalMode("custom");
                  if (customCriteria.length === 0) addCriterion();
                }}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  preEvalMode === "custom"
                    ? "border-purple-400 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-medium text-mr-navy">
                  🎯 Özel Kriterler Ekle
                </div>
                <div className="text-xs text-mr-text-secondary mt-1">
                  Ek değerlendirme kriterleri ve yönlendirme belirle
                </div>
              </button>
            </div>

            {/* Custom Criteria Section */}
            {preEvalMode === "custom" && (
              <div className="space-y-3 border rounded-lg p-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-mr-navy">
                    Ek Kriterler
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addCriterion}
                    className="text-xs h-7"
                  >
                    + Kriter Ekle
                  </Button>
                </div>

                {customCriteria.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-white rounded-md p-2 border"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder="Kriter adı (ör: İngilizce seviyesi)"
                        value={c.label}
                        onChange={(e) =>
                          updateCriterion(idx, "label", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Açıklama (opsiyonel)"
                        value={c.description}
                        onChange={(e) =>
                          updateCriterion(idx, "description", e.target.value)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <select
                      value={c.weight}
                      onChange={(e) =>
                        updateCriterion(idx, "weight", e.target.value)
                      }
                      className="border rounded px-2 py-1 text-xs bg-white h-8 w-20"
                    >
                      <option value="high">Yüksek</option>
                      <option value="medium">Orta</option>
                      <option value="low">Düşük</option>
                    </select>
                    <button
                      onClick={() => removeCriterion(idx)}
                      className="text-red-400 hover:text-red-600 text-lg mt-1 shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div>
                  <label className="text-xs font-medium text-mr-text-secondary block mb-1">
                    Ek Yönlendirme (opsiyonel)
                  </label>
                  <Textarea
                    placeholder="AI'ya ek talimatlar... (ör: Otel deneyimi olan adaylara öncelik ver)"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreEval(false)}>
              İptal
            </Button>
            <Button
              className="bg-mr-gold hover:bg-mr-gold-dark text-white"
              onClick={startEvaluation}
              disabled={evaluating}
            >
              {evaluating ? "Başlatılıyor..." : "🚀 Değerlendirmeyi Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ İlerleme Çubuğu Dialog ═══ */}
      <Dialog
        open={showProgress}
        onOpenChange={(open) => {
          if (!open) setShowProgress(false);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>🤖 AI Değerlendirme Devam Ediyor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-mr-gold to-amber-400"
                style={{
                  width: `${progressTotal > 0 ? Math.round(((progressCompleted + progressFailed) / progressTotal) * 100) : 0}%`,
                }}
              />
            </div>

            {/* Stats */}
            <div className="text-center">
              <div className="text-2xl font-bold text-mr-navy">
                {progressCompleted + progressFailed}{" "}
                <span className="text-sm font-normal text-mr-text-secondary">
                  / {progressTotal}
                </span>
              </div>
              <div className="text-sm text-mr-text-secondary">
                aday değerlendirildi
                {progressTotal > 0 && (
                  <span className="ml-2 font-medium text-mr-navy">
                    (%
                    {Math.round(
                      ((progressCompleted + progressFailed) / progressTotal) *
                        100,
                    )}
                    )
                  </span>
                )}
              </div>
            </div>

            {/* Detail Breakdown */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700">
                  {progressCompleted} başarılı
                </span>
              </span>
              {progressFailed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-700">
                    {progressFailed} başarısız
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-700">
                  {progressTotal - progressCompleted - progressFailed} bekleyen
                </span>
              </span>
            </div>

            {/* Estimated Time */}
            {progressCompleted > 0 &&
              progressCompleted + progressFailed < progressTotal && (
                <div className="text-center text-xs text-mr-text-secondary">
                  Tahmini kalan süre:{" "}
                  {(() => {
                    const elapsed = (Date.now() - progressStartTime) / 1000;
                    const done = progressCompleted + progressFailed;
                    const perItem = elapsed / done;
                    const remaining = Math.ceil(
                      perItem * (progressTotal - done),
                    );
                    if (remaining < 60) return `~${remaining} saniye`;
                    return `~${Math.ceil(remaining / 60)} dakika`;
                  })()}
                </div>
              )}

            {/* Animated dots */}
            {progressCompleted + progressFailed < progressTotal && (
              <div className="flex items-center justify-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-mr-gold animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-mr-gold animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-mr-gold animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProgress(false)}
            >
              Arka Planda Çalışsın
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Toplu Not/Karar Dialog ═══ */}
      <Dialog open={showBulkNote} onOpenChange={setShowBulkNote}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📝 Toplu Not & Nihai Karar</DialogTitle>
            <DialogDescription>
              {selectedIds.size} aday için not ve/veya nihai karar girin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Değerlendirme Notu
              </label>
              <Textarea
                placeholder="Seçili adaylar hakkında notunuzu yazın..."
                value={bulkNoteText}
                onChange={(e) => setBulkNoteText(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-2">
                Nihai Karar
              </label>
              <div className="flex flex-wrap gap-2">
                {FINAL_DECISIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() =>
                      setBulkDecision(bulkDecision === d.value ? "" : d.value)
                    }
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      bulkDecision === d.value
                        ? d.cls + " ring-2 ring-offset-1 ring-current"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkNote(false)}
              disabled={savingNote}
            >
              İptal
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={savingNote || (!bulkNoteText.trim() && !bulkDecision)}
              onClick={async () => {
                const evalIds = selectedCandidates.map((c) => c.evaluationId);
                await saveNote(
                  evalIds,
                  bulkNoteText.trim() || undefined,
                  bulkDecision || undefined,
                );
                setShowBulkNote(false);
                setSelectedIds(new Set());
              }}
            >
              {savingNote
                ? "Kaydediliyor..."
                : `💾 Kaydet (${selectedIds.size} aday)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Düzenle Dialog ═══ */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Değerlendirmeyi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Ad
              </label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Açıklama
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Durum
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="draft">Taslak</option>
                <option value="screening">Eleme</option>
                <option value="evaluating">Değerlendirme</option>
                <option value="completed">Tamamlandı</option>
                <option value="archived">Arşiv</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEdit(false)}
              disabled={saving}
            >
              İptal
            </Button>
            <Button
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              onClick={updateSession}
              disabled={saving}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ AI Değerlendirme Asistanı ═══ */}
      <EvaluationAiAssistant
        fieldDefs={fieldDefs}
        stats={{
          total: session.stats.total,
          evaluated: session.stats.completed,
          pending: session.stats.pending,
          failed: session.stats.failed,
        }}
        filteredCount={filteredCandidates.length}
        preFilterActive={preFilterActive}
        departments={departments}
        onAction={handleAiAction}
      />
    </div>
  );
}
