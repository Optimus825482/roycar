"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AppLoader, AppSkeleton } from "@/components/shared/AppLoader";

/* ─────────── Types ─────────── */

interface FieldValue {
  id: string;
  value: string;
  fieldDefinition: {
    id: string;
    fieldName: string;
    fieldCategory: string;
    dataType: string;
  };
}

interface EvalReport {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  fitAnalysis: string;
  recommendation: string;
  recommendationReason: string;
}

interface ApplicationDetail {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  photoPath: string | null;
  status: string;
  submittedAt: string;
  department: { id: string; name: string } | null;
  positionTitle: string | null;
  formConfig: { id: string; title: string; mode: string };
  responses: {
    id: string;
    answerText: string | null;
    answerJson: unknown;
    answerFile: string | null;
    question: { id: string; questionText: string; questionType: string };
  }[];
  evaluation: {
    id: string;
    overallScore: number;
    status: string;
    report: EvalReport | null;
    evaluatedAt: string | null;
    retryCount: number;
  } | null;
  fieldValues?: FieldValue[];
  otherApplications?: {
    id: string;
    applicationNo: string;
    fullName: string;
    status: string;
    submittedAt: string;
    formConfig: { id: string; title: string };
    department: { name: string } | null;
    positionTitle?: string | null;
    evaluation: {
      overallScore: number;
      status: string;
      evaluatedAt: string | null;
      report: EvalReport | null;
    } | null;
  }[];
}

/* ─────────── Constants ─────────── */

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white border-blue-700",
  reviewed: "bg-amber-500 text-white border-amber-600",
  shortlisted: "bg-emerald-600 text-white border-emerald-700",
  rejected: "bg-red-600 text-white border-red-700",
  hired: "bg-green-600 text-white border-green-700",
};

const STATUS_OPTIONS = ["new", "reviewed", "shortlisted", "rejected", "hired"];

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> =
  {
    shortlist: {
      label: "Ön Elemeyi Geçti",
      color: "bg-emerald-600 text-white border-emerald-700",
    },
    interview: {
      label: "Mülakata Çağır",
      color: "bg-blue-600 text-white border-blue-700",
    },
    reject: { label: "Reddet", color: "bg-red-600 text-white border-red-700" },
    hire: {
      label: "İşe Al",
      color: "bg-green-600 text-white border-green-700",
    },
  };

const CATEGORY_LABELS: Record<string, string> = {
  personal: "Kişisel Bilgiler",
  education: "Eğitim",
  experience: "İş Deneyimi",
  contact: "İletişim",
  legal: "Yasal",
  housing: "Lojman/Konaklama",
  media: "Dosya/Medya",
  general: "Diğer",
};

/* ─────────── Props ─────────── */

interface ApplicationDetailModalProps {
  applicationId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

/* ─────────── Component ─────────── */

export function ApplicationDetailModal({
  applicationId,
  open,
  onClose,
  onUpdate,
}: ApplicationDetailModalProps) {
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  // Reset isClosing when modal opens
  const effectiveIsClosing = open ? isClosing : false;

  // Derived: auto-select primary app without setState in effect
  const activeAppId = selectedAppId ?? app?.id ?? null;

  // Combined applications list for table
  const allApplications = useMemo(() => {
    if (!app) return [];
    return [
      {
        id: app.id,
        submittedAt: app.submittedAt,
        departmentName:
          app.department?.name || app.positionTitle || "Belirtilmemiş",
        formTitle: app.formConfig.title,
        status: app.status,
        score: app.evaluation?.overallScore ?? null,
        isPrimary: true,
      },
      ...(app.otherApplications || []).map((oa) => ({
        id: oa.id,
        submittedAt: oa.submittedAt,
        departmentName:
          oa.department?.name || oa.positionTitle || "Belirtilmemiş",
        formTitle: oa.formConfig.title,
        status: oa.status,
        score: oa.evaluation?.overallScore ?? null,
        isPrimary: false,
      })),
    ];
  }, [app]);

  const fetchDetail = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setApp(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`);
      const json = await res.json();
      if (json.success) setApp(json.data);
    } catch {
      toast.error("Başvuru bilgileri yüklenemedi");
    }
    setLoading(false);
  }, [applicationId]);

  const prevOpenRef = useRef(false);
  const prevAppIdRef = useRef(applicationId);
  useEffect(() => {
    if (open && applicationId) {
      const justOpened = !prevOpenRef.current;
      const idChanged = prevAppIdRef.current !== applicationId;
      prevOpenRef.current = true;
      prevAppIdRef.current = applicationId;
      if (justOpened || idChanged) {
        // Wrap in microtask so setState inside fetchDetail is not synchronous within the effect body
        queueMicrotask(() => fetchDetail());
      }
    } else {
      prevOpenRef.current = false;
    }
  }, [open, applicationId, fetchDetail]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setApp(null);
      setSelectedAppId(null);
    }, 280);
  };

  const updateStatus = async (newStatus: string) => {
    if (!applicationId) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(
        `/api/admin/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      const json = await res.json();
      if (json.success && app) {
        setApp({ ...app, status: newStatus });
        toast.success("Durum güncellendi", {
          description: STATUS_LABELS[newStatus],
        });
        onUpdate?.();
      }
    } catch {
      toast.error("Durum güncellenemedi");
    }
    setStatusUpdating(false);
  };

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount or modal close
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startEvaluation = async () => {
    if (!applicationId) return;
    setEvaluating(true);
    try {
      const res = await fetch(`/api/admin/evaluations/${applicationId}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("AI Değerlendirme başlatıldı, sonuç bekleniyor...");
        // Poll every 3 seconds until evaluation completes
        let attempts = 0;
        const maxAttempts = 30; // max ~90 seconds
        pollRef.current = setInterval(async () => {
          attempts++;
          try {
            const pollRes = await fetch(
              `/api/admin/applications/${applicationId}`,
            );
            const pollJson = await pollRes.json();
            if (pollJson.success) {
              const evalStatus = pollJson.data.evaluation?.status;
              if (evalStatus === "completed" || evalStatus === "failed") {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = null;
                setApp(pollJson.data);
                setEvaluating(false);
                onUpdate?.();
                if (evalStatus === "completed") {
                  toast.success("AI Değerlendirme tamamlandı!");
                } else {
                  toast.error("AI Değerlendirme başarısız oldu");
                }
              }
            }
          } catch {
            /* ignore poll errors */
          }
          if (attempts >= maxAttempts) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setEvaluating(false);
            toast.error("Değerlendirme zaman aşımına uğradı");
            fetchDetail();
          }
        }, 3000);
      } else {
        toast.error("Değerlendirme başlatılamadı", { description: json.error });
        setEvaluating(false);
      }
    } catch {
      toast.error("Değerlendirme başlatılamadı");
      setEvaluating(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Group field values
  const groupedFields = (() => {
    if (!app?.fieldValues?.length) return {};
    const grouped: Record<string, FieldValue[]> = {};
    for (const fv of app.fieldValues) {
      const cat = fv.fieldDefinition.fieldCategory || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(fv);
    }
    return grouped;
  })();

  const categoryOrder = [
    "personal",
    "education",
    "experience",
    "contact",
    "legal",
    "housing",
    "media",
    "general",
  ];
  const sortedCategories = Object.keys(groupedFields).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  if (!open) return null;

  const totalApplications = 1 + (app?.otherApplications?.length || 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${effectiveIsClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div
          className={`pointer-events-auto bg-white rounded-2xl shadow-3d-lg w-full max-w-3xl max-h-[90vh] flex flex-col transition-all duration-300 ease-out ${effectiveIsClosing ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-fade-in-scale"}`}
          role="dialog"
          aria-modal="true"
          aria-label="Aday Detayı"
        >
          {/* ─── Header ─── */}
          <div className="sticky top-0 z-10 bg-linear-to-r from-mr-navy to-mr-navy-light px-6 py-4 flex items-center gap-4 rounded-t-2xl">
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M14 4L4 14M4 4l10 10" />
              </svg>
            </button>

            {loading ? (
              <div className="flex-1 flex items-center gap-3">
                <AppSkeleton className="w-12 h-12 rounded-full bg-white/20!" />
                <div className="space-y-2 flex-1">
                  <AppSkeleton className="h-5 w-40 bg-white/20!" />
                  <AppSkeleton className="h-3 w-28 bg-white/15!" />
                </div>
              </div>
            ) : app ? (
              <div className="flex-1 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-mr-gold/30 flex items-center justify-center text-white text-lg font-bold shrink-0 ring-2 ring-mr-gold/40">
                  {app.photoPath ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={app.photoPath}
                      alt={app.fullName}
                      width={48}
                      height={48}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    app.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-heading text-white font-bold truncate">
                      {app.fullName}
                    </h2>
                    {totalApplications > 1 && (
                      <Badge className="bg-mr-gold text-mr-navy text-[10px] px-2 font-bold">
                        {totalApplications} Başvuru
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-white/70 text-xs">
                    <span>
                      {app.department?.name || app.positionTitle || "—"}
                    </span>
                    <span>•</span>
                    <span>{formatDate(app.submittedAt)}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${STATUS_COLORS[app.status] || ""}`}
                >
                  {STATUS_LABELS[app.status] || app.status}
                </Badge>
              </div>
            ) : null}
          </div>

          {/* ─── Content ─── */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <AppLoader
                  size="lg"
                  text="Aday bilgileri yükleniyor..."
                  variant="spinner"
                />
              </div>
            ) : !app ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <svg
                  width="48"
                  height="48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-slate-400"
                >
                  <circle cx="24" cy="24" r="20" />
                  <path d="M15 20h18M15 28h12" />
                </svg>
                <p className="text-slate-600 font-medium">
                  Başvuru bulunamadı.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* ─── Aday Bilgileri ─── */}
                <div className="animate-fade-in-scale">
                  <h3 className="text-sm font-bold text-mr-navy flex items-center gap-2 mb-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-mr-gold"
                    >
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Aday Bilgileri
                  </h3>
                  <Card className="border-slate-200">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <InfoRow label="Ad Soyad" value={app.fullName} />
                        <InfoRow label="E-posta" value={app.email} />
                        <InfoRow label="Telefon" value={app.phone} />
                        <InfoRow
                          label="Toplam Başvuru"
                          value={String(totalApplications)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* ─── Başvuru Geçmişi Tablosu ─── */}
                <div className="animate-slide-in-up delay-50">
                  <h3 className="text-sm font-bold text-mr-navy flex items-center gap-2 mb-3">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-mr-gold"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                    Başvuru Geçmişi
                    {totalApplications > 1 && (
                      <Badge className="bg-mr-navy text-white text-[10px]">
                        {totalApplications}
                      </Badge>
                    )}
                  </h3>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] text-mr-text-secondary font-semibold uppercase tracking-wider">
                          <th className="text-left px-3 py-2.5">Tarih</th>
                          <th className="text-left px-3 py-2.5">Departman</th>
                          <th className="text-left px-3 py-2.5">Durum</th>
                          <th className="text-center px-3 py-2.5">AI Puanı</th>
                          <th className="w-8 px-1" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allApplications.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedAppId(row.id)}
                            className={`cursor-pointer transition-colors ${
                              activeAppId === row.id
                                ? "bg-mr-navy/5 border-l-2 border-l-mr-gold"
                                : "hover:bg-slate-50"
                            } ${row.isPrimary ? "font-medium" : ""}`}
                          >
                            <td className="px-3 py-2.5 text-mr-navy text-xs">
                              {formatDate(row.submittedAt)}
                            </td>
                            <td className="px-3 py-2.5 text-mr-navy text-xs">
                              {row.departmentName}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${STATUS_COLORS[row.status] || ""}`}
                              >
                                {STATUS_LABELS[row.status] || row.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {row.score != null ? (
                                <span
                                  className={`font-bold text-sm ${
                                    row.score >= 70
                                      ? "text-emerald-600"
                                      : row.score >= 40
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {row.score}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-1 text-center">
                              <svg
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className={`text-slate-400 transition-transform duration-200 inline-block ${activeAppId === row.id ? "rotate-90" : ""}`}
                              >
                                <path d="M5 3l4 4-4 4" />
                              </svg>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ─── Seçili Başvuru Detayları ─── */}
                {activeAppId && (
                  <>
                    <Separator />
                    <div
                      className="space-y-5 animate-fade-in-scale"
                      key={activeAppId}
                    >
                      <h3 className="text-sm font-bold text-mr-navy flex items-center gap-2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-mr-gold"
                        >
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Başvuru Detayı
                        <span className="text-xs text-mr-text-secondary font-normal">
                          —{" "}
                          {
                            allApplications.find((a) => a.id === activeAppId)
                              ?.departmentName
                          }
                          {" · "}
                          {formatDate(
                            allApplications.find((a) => a.id === activeAppId)
                              ?.submittedAt || "",
                          )}
                        </span>
                      </h3>

                      {/* Durum Değiştir - only for primary app */}
                      {activeAppId === app.id && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-mr-navy">
                              Durum Değiştir
                            </span>
                            <Select
                              value={app.status}
                              onValueChange={updateStatus}
                              disabled={statusUpdating}
                            >
                              <SelectTrigger
                                className="w-40 h-9 text-sm font-medium"
                                aria-label="Durumu değiştir"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Separator />
                        </>
                      )}

                      {/* Dynamic Fields - only for primary app */}
                      {activeAppId === app.id &&
                        sortedCategories.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-mr-navy flex items-center gap-2">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-mr-gold"
                              >
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                              Aday Verileri
                              <Badge className="bg-mr-navy text-white text-[10px]">
                                {app.fieldValues?.length || 0} alan
                              </Badge>
                            </h4>
                            <div className="space-y-2">
                              {sortedCategories.map((cat) => (
                                <CollapsibleSection
                                  key={cat}
                                  title={CATEGORY_LABELS[cat] || cat}
                                >
                                  <div className="space-y-1">
                                    {groupedFields[cat].map((fv) => (
                                      <InfoRow
                                        key={fv.id}
                                        label={fv.fieldDefinition.fieldName}
                                        value={fv.value}
                                      />
                                    ))}
                                  </div>
                                </CollapsibleSection>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Form Yanıtları - only for primary app */}
                      {activeAppId === app.id && app.responses.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-mr-navy flex items-center gap-2">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-mr-gold"
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            Form Yanıtları
                            <Badge className="bg-mr-gold text-mr-navy text-[10px]">
                              {app.responses.length}
                            </Badge>
                          </h4>
                          <Card className="border-slate-200">
                            <CardContent className="pt-4 space-y-3 divide-y divide-slate-100">
                              {app.responses.map((r) => (
                                <div key={r.id} className="pt-3 first:pt-0">
                                  <p className="text-xs font-semibold text-mr-navy mb-1">
                                    {r.question.questionText}
                                  </p>
                                  <p className="text-sm text-mr-text-secondary">
                                    {r.answerText ||
                                      (r.answerJson
                                        ? JSON.stringify(r.answerJson)
                                        : r.answerFile || "—")}
                                  </p>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* ─── AI Değerlendirme (EN ALTTA) ─── */}
                      {(() => {
                        const selEval =
                          activeAppId === app.id
                            ? app.evaluation
                            : app.otherApplications?.find(
                                (a) => a.id === activeAppId,
                              )?.evaluation;
                        const selReport = selEval?.report as EvalReport | null;

                        return (
                          <Card className="border-mr-navy/15 bg-linear-to-r from-mr-navy/3 to-mr-gold/5">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-mr-navy flex items-center gap-2">
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-mr-gold"
                                  >
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                  </svg>
                                  AI Değerlendirme
                                </CardTitle>
                                {activeAppId === app.id && !app.evaluation && (
                                  <Button
                                    size="sm"
                                    className="h-8 bg-mr-navy hover:bg-mr-navy-light text-white text-xs font-semibold cursor-pointer"
                                    onClick={startEvaluation}
                                    disabled={evaluating}
                                  >
                                    {evaluating ? (
                                      <AppLoader size="sm" variant="dots" />
                                    ) : (
                                      "AI Değerlendirmesi Oluştur"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              {!selEval ? (
                                <p className="text-sm text-mr-text-secondary py-3">
                                  Henüz AI değerlendirmesi yapılmamış.
                                </p>
                              ) : selEval.status === "pending" ? (
                                <div className="flex items-center gap-3 py-4">
                                  <AppLoader size="sm" variant="spinner" />
                                  <span className="text-sm text-amber-600 font-semibold">
                                    Değerlendirme devam ediyor...
                                  </span>
                                </div>
                              ) : selEval.status === "completed" &&
                                selReport ? (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <div
                                      className={`w-16 h-16 rounded-full border-3 flex items-center justify-center text-xl font-bold ${
                                        selReport.overallScore >= 70
                                          ? "text-emerald-700 border-emerald-400 bg-emerald-50"
                                          : selReport.overallScore >= 40
                                            ? "text-amber-700 border-amber-400 bg-amber-50"
                                            : "text-red-700 border-red-400 bg-red-50"
                                      }`}
                                    >
                                      {selReport.overallScore}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                      {selReport.recommendation && (
                                        <Badge
                                          className={`text-xs ${RECOMMENDATION_LABELS[selReport.recommendation]?.color || "bg-slate-600 text-white"}`}
                                        >
                                          {RECOMMENDATION_LABELS[
                                            selReport.recommendation
                                          ]?.label || selReport.recommendation}
                                        </Badge>
                                      )}
                                      {selReport.summary && (
                                        <p className="text-sm text-mr-text-secondary leading-relaxed">
                                          {selReport.summary}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {(selReport.strengths?.length > 0 ||
                                    selReport.weaknesses?.length > 0) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {selReport.strengths?.length > 0 && (
                                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                          <h4 className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
                                            <svg
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              className="text-emerald-600"
                                            >
                                              <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                            Güçlü Yönler
                                          </h4>
                                          <ul className="space-y-1">
                                            {selReport.strengths.map((s, i) => (
                                              <li
                                                key={i}
                                                className="text-xs text-emerald-800 flex items-start gap-1.5"
                                              >
                                                <span className="text-emerald-500 mt-0.5 font-bold">
                                                  •
                                                </span>
                                                <span>{s}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {selReport.weaknesses?.length > 0 && (
                                        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                          <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                                            <svg
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2.5"
                                              className="text-red-600"
                                            >
                                              <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Zayıf Yönler
                                          </h4>
                                          <ul className="space-y-1">
                                            {selReport.weaknesses.map(
                                              (w, i) => (
                                                <li
                                                  key={i}
                                                  className="text-xs text-red-800 flex items-start gap-1.5"
                                                >
                                                  <span className="text-red-500 mt-0.5 font-bold">
                                                    •
                                                  </span>
                                                  <span>{w}</span>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {selReport.fitAnalysis && (
                                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                      <h4 className="text-xs font-bold text-blue-800 mb-1">
                                        Pozisyon Uyumu
                                      </h4>
                                      <p className="text-xs text-blue-800">
                                        {selReport.fitAnalysis}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-red-600 font-medium py-3">
                                  Değerlendirme başarısız oldu.
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Bottom spacer */}
                <div className="h-4" />
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          {app && (
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end rounded-b-2xl">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                onClick={handleClose}
              >
                Kapat
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────── Sub Components ─────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs text-mr-text-secondary shrink-0 font-medium">
        {label}
      </span>
      <span className="text-sm text-mr-navy text-right font-medium">
        {value || "—"}
      </span>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <span className="text-xs font-bold text-mr-navy">{title}</span>
        <svg
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {open && <div className="px-4 py-2 bg-white">{children}</div>}
    </div>
  );
}
