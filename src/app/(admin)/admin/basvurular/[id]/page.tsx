"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* ─────────── Types ─────────── */

interface OtherApplication {
  id: string;
  applicationNo: string;
  fullName: string;
  status: string;
  submittedAt: string;
  formConfig: { id: string; title: string };
  department: { name: string };
  evaluation: {
    overallScore: number;
    status: string;
    evaluatedAt: string | null;
    report: EvalReport | null;
  } | null;
}

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

interface ApplicationDetail {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  photoPath: string | null;
  status: string;
  submittedAt: string;
  department: { id: string; name: string };
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
  otherApplications?: OtherApplication[];
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

/* ─────────── Constants ─────────── */

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  reviewed: "bg-amber-100 text-amber-800 border-amber-200",
  shortlisted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  hired: "bg-green-100 text-green-800 border-green-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  personal: "👤 Kişisel Bilgiler",
  education: "🎓 Eğitim",
  experience: "💼 İş Deneyimi",
  contact: "📞 İletişim",
  legal: "📄 Yasal",
  housing: "🏠 Lojman/Konaklama",
  media: "📁 Dosya/Medya",
  general: "📋 Diğer",
};

const CATEGORY_ICON_COLORS: Record<string, string> = {
  personal: "from-blue-50 to-blue-100 border-blue-200",
  education: "from-purple-50 to-purple-100 border-purple-200",
  experience: "from-amber-50 to-amber-100 border-amber-200",
  contact: "from-green-50 to-green-100 border-green-200",
  legal: "from-gray-50 to-gray-100 border-gray-200",
  housing: "from-cyan-50 to-cyan-100 border-cyan-200",
  media: "from-pink-50 to-pink-100 border-pink-200",
  general: "from-slate-50 to-slate-100 border-slate-200",
};

const STATUS_OPTIONS = ["new", "reviewed", "shortlisted", "rejected", "hired"];

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  shortlist: { label: "Ön Elemeyi Geçti", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  interview: { label: "Mülakata Çağır", color: "bg-blue-100 text-blue-800 border-blue-300" },
  reject: { label: "Reddet", color: "bg-red-100 text-red-800 border-red-300" },
  hire: { label: "İşe Al", color: "bg-green-100 text-green-800 border-green-300" },
};

/* ─────────── Helper Components ─────────── */

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";
  const bgColor = score >= 70 ? "bg-emerald-50 border-emerald-200" : score >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const sizeClass = size === "lg" ? "w-20 h-20 text-2xl" : "w-10 h-10 text-sm";

  return (
    <div className={`${sizeClass} ${bgColor} ${color} rounded-full border-2 flex items-center justify-center font-bold`}>
      {score}
    </div>
  );
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <span className="text-xs text-mr-text-muted shrink-0">{label}</span>
      {badge ? (
        <Badge variant="outline" className="text-xs">{value}</Badge>
      ) : (
        <span className="text-sm text-mr-text-primary text-right">{value || "—"}</span>
      )}
    </div>
  );
}

function SectionCard({
  title,
  colorClass,
  children,
  defaultOpen = true,
}: {
  title: string;
  colorClass: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`overflow-hidden border bg-linear-to-br ${colorClass}`}>
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-mr-navy">{title}</CardTitle>
          <span className="text-xs text-mr-text-muted">{open ? "▲" : "▼"}</span>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 pb-3 px-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/* ─────────── Main Page ─────────── */

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [emailPending, setEmailPending] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  const [otherResponses, setOtherResponses] = useState<Record<string, ApplicationDetail["responses"]>>({});
  const [loadingResponses, setLoadingResponses] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/applications/${params.id}`);
      const json = await res.json();
      if (json.success) setApp(json.data);
    } catch {
      toast.error("Başvuru bilgileri yüklenemedi", { description: "Lütfen sayfayı yenileyin." });
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  /* — Actions — */

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/applications/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success && app) {
        setApp({ ...app, status: newStatus });
        toast.success("Durum güncellendi", { description: STATUS_LABELS[newStatus] });
        const notifiable = ["shortlisted", "rejected", "hired"];
        if (notifiable.includes(newStatus) && app.email) {
          setEmailPending(newStatus);
        }
      }
    } catch {
      toast.error("Durum güncellenemedi");
    }
    setStatusUpdating(false);
  };

  const sendEmailNotification = async () => {
    if (!emailPending) return;
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/applications/${params.id}/notify`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("E-posta gönderildi", { description: `${app?.fullName} adresine bildirim iletildi.` });
      } else {
        toast.error("E-posta gönderilemedi", { description: json.error || "SMTP ayarlarını kontrol edin." });
      }
    } catch {
      toast.error("E-posta gönderilemedi", { description: "Bağlantı hatası." });
    }
    setSendingEmail(false);
    setEmailPending(null);
  };

  const startEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`/api/admin/evaluations/${params.id}/retry`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("AI Değerlendirme başlatıldı", { description: "Sonuçlar birkaç dakika içinde hazır olacak." });
        setTimeout(fetchDetail, 5000);
      } else {
        toast.error("Değerlendirme başlatılamadı", { description: json.error });
      }
    } catch {
      toast.error("Değerlendirme başlatılamadı");
    }
    setEvaluating(false);
  };

  const retryEvaluation = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/admin/evaluations/${params.id}/retry`, { method: "POST" });
      toast.success("Değerlendirme yeniden başlatıldı");
      setTimeout(fetchDetail, 5000);
    } catch {
      toast.error("Değerlendirme yeniden başlatılamadı");
    }
    setRetrying(false);
  };

  const fetchOtherResponses = async (otherId: string) => {
    if (otherResponses[otherId]) {
      setExpandedResponseId(expandedResponseId === otherId ? null : otherId);
      return;
    }
    setLoadingResponses(otherId);
    try {
      const res = await fetch(`/api/admin/applications/${otherId}`);
      const json = await res.json();
      if (json.success) {
        setOtherResponses((prev) => ({ ...prev, [otherId]: json.data.responses }));
        setExpandedResponseId(otherId);
      }
    } catch {
      toast.error("Yanıtlar yüklenemedi");
    }
    setLoadingResponses(null);
  };

  /* — Render helpers — */

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Group field values by category
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

  const categoryOrder = ["personal", "education", "experience", "contact", "legal", "housing", "media", "general"];
  const sortedCategories = Object.keys(groupedFields).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  /* — Loading & Error States — */

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-mr-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-mr-text-muted">Yükleniyor...</span>
        </div>
      </div>
    );

  if (!app)
    return (
      <div className="flex flex-col items-center py-20 gap-3">
        <span className="text-4xl">😔</span>
        <p className="text-mr-error font-medium">Başvuru bulunamadı.</p>
        <Button variant="outline" onClick={() => router.push("/admin/basvurular")}>
          ← Başvurulara Dön
        </Button>
      </div>
    );

  const report = app.evaluation?.report as EvalReport | null;
  const totalApplications = 1 + (app.otherApplications?.length || 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto" role="main" aria-label="Aday profili">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar / Photo */}
          <div className="w-16 h-16 rounded-full bg-linear-to-br from-mr-navy to-mr-gold flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
            {app.photoPath ? (
              <img
                src={app.photoPath}
                alt={app.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              app.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-heading text-mr-navy">{app.fullName}</h1>
              {totalApplications > 1 && (
                <Badge className="bg-mr-warning/90 text-white text-[10px] px-2">
                  {totalApplications} Başvuru
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs border-mr-navy/20">{app.department.name}</Badge>
              <span className="text-xs text-mr-text-muted">·</span>
              <span className="text-xs text-mr-text-muted">{formatDate(app.submittedAt)}</span>
              <span className="text-xs text-mr-text-muted">·</span>
              <span className="text-xs text-mr-text-muted">{app.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-mr-text-muted" onClick={() => router.push("/admin/basvurular")}>
                ← Başvurulara Dön
              </Button>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-3 self-start">
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[app.status] || ""}`}>
            {STATUS_LABELS[app.status] || app.status}
          </Badge>
          <Select value={app.status} onValueChange={updateStatus} disabled={statusUpdating}>
            <SelectTrigger className="w-36 h-8 text-xs" aria-label="Durumu değiştir">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* ═══════════════════ AI EVALUATION CARD ═══════════════════ */}
      <Card className="border-mr-navy/10 bg-linear-to-r from-mr-navy/2 to-mr-gold/3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-mr-navy flex items-center gap-2">
              🤖 AI Değerlendirme
            </CardTitle>
            <div className="flex items-center gap-2">
              {!app.evaluation && (
                <Button
                  size="sm"
                  className="h-8 bg-mr-navy hover:bg-mr-navy/90 text-white text-xs"
                  onClick={startEvaluation}
                  disabled={evaluating}
                >
                  {evaluating ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      Başlatılıyor...
                    </>
                  ) : (
                    "🚀 AI Değerlendirmesi Oluştur"
                  )}
                </Button>
              )}
              {app.evaluation?.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  onClick={retryEvaluation}
                  disabled={retrying}
                >
                  {retrying ? "Deneniyor..." : "🔄 Yeniden Dene"}
                </Button>
              )}
              {app.evaluation?.status === "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={retryEvaluation}
                  disabled={retrying}
                >
                  {retrying ? "Deneniyor..." : "🔄 Yeniden Değerlendir"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!app.evaluation ? (
            <div className="flex items-center gap-3 py-4 text-sm text-mr-text-muted">
              <span className="text-2xl">📊</span>
              <p>Henüz AI değerlendirmesi yapılmamış. Yukarıdaki butona tıklayarak başlatabilirsiniz.</p>
            </div>
          ) : app.evaluation.status === "pending" ? (
              <div className="flex items-center gap-3 py-4">
                <div className="w-6 h-6 border-2 border-mr-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-amber-600 font-medium">Değerlendirme devam ediyor...</p>
              </div>
            ) : app.evaluation.status === "failed" ? (
                <div className="flex items-center gap-3 py-4">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm text-red-600 font-medium">Değerlendirme başarısız.</p>
                    <p className="text-xs text-mr-text-muted">{app.evaluation.retryCount} deneme yapıldı</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Score & Recommendation Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <ScoreCircle score={app.evaluation.overallScore} />
                    <div className="space-y-2 flex-1">
                  {report?.recommendation && (
                    <Badge
                            variant="outline"
                            className={`text-sm px-3 py-1 ${RECOMMENDATION_LABELS[report.recommendation]?.color || "bg-gray-100"}`}
                    >
                            {RECOMMENDATION_LABELS[report.recommendation]?.label || report.recommendation}
                    </Badge>
                  )}
                        {report?.summary && (
                          <p className="text-sm text-mr-text-secondary leading-relaxed">{report.summary}</p>
                        )}
                        {app.evaluation.evaluatedAt && (
                          <p className="text-xs text-mr-text-muted">
                            Değerlendirilme: {formatDate(app.evaluation.evaluatedAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    {report && (report.strengths?.length > 0 || report.weaknesses?.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {report.strengths?.length > 0 && (
                          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <h4 className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                              ✅ Güçlü Yönler
                            </h4>
                            <ul className="space-y-1">
                              {report.strengths.map((s, i) => (
                                <li key={i} className="text-xs text-emerald-800 flex items-start gap-1">
                                  <span className="text-emerald-400 mt-0.5">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {report.weaknesses?.length > 0 && (
                          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                            <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                              ⚠️ Zayıf Yönler / Riskler
                            </h4>
                            <ul className="space-y-1">
                              {report.weaknesses.map((w, i) => (
                                <li key={i} className="text-xs text-red-800 flex items-start gap-1">
                                  <span className="text-red-400 mt-0.5">•</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

              {/* Fit Analysis & Recommendation Reason */}
              {report?.fitAnalysis && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <h4 className="text-xs font-semibold text-blue-700 mb-1">🎯 Pozisyon Uyumu</h4>
                  <p className="text-xs text-blue-800">{report.fitAnalysis}</p>
                </div>
              )}
              {report?.recommendationReason && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-700 mb-1">💡 Öneri Gerekçesi</h4>
                  <p className="text-xs text-gray-800">{report.recommendationReason}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════ CANDIDATE INFO SECTIONS ═══════════════════ */}
      {/* Basic Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-mr-navy/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-mr-navy flex items-center gap-1.5">
              📞 İletişim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <InfoRow label="Ad Soyad" value={app.fullName} />
            <InfoRow label="E-posta" value={app.email} />
            <InfoRow label="Telefon" value={app.phone} />
            <InfoRow label="Departman" value={app.department.name} badge />
            <InfoRow label="Başvuru Tarihi" value={formatDate(app.submittedAt)} />
            <InfoRow label="Form" value={app.formConfig.title} />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-mr-navy/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-mr-navy flex items-center gap-1.5">
              📊 Özet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-2xl font-bold text-blue-700">{totalApplications}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Toplam Başvuru</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-2xl font-bold text-emerald-700">
                  {app.evaluation?.overallScore ?? "—"}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">AI Puanı</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">
                  {app.fieldValues?.length || 0}
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">Veri Alanı</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-2xl font-bold text-purple-700">{app.responses.length}</p>
                <p className="text-[10px] text-purple-600 mt-0.5">Form Yanıtı</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════ DYNAMIC FIELD VALUE SECTIONS ═══════════════════ */}
      {sortedCategories.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-mr-navy flex items-center gap-2">
            📂 Aday Bilgileri
            <Badge variant="outline" className="text-[10px]">{app.fieldValues?.length || 0} alan</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedCategories.map((cat) => (
              <SectionCard
                key={cat}
                title={CATEGORY_LABELS[cat] || cat}
                colorClass={CATEGORY_ICON_COLORS[cat] || CATEGORY_ICON_COLORS.general}
                defaultOpen={cat === "personal" || cat === "education"}
              >
                <div className="space-y-0.5">
                  {groupedFields[cat].map((fv) => (
                    <InfoRow key={fv.id} label={fv.fieldDefinition.fieldName} value={fv.value} />
                  ))}
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════ ALL APPLICATIONS ═══════════════════ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-mr-navy flex items-center gap-2">
          📋 Tüm Başvurular
          <Badge variant="outline" className="text-[10px]">{totalApplications} başvuru</Badge>
        </h2>

        {/* Current Application */}
        <Card className="border-mr-gold/30 bg-mr-gold/3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-mr-gold text-white text-[10px]">Bu Başvuru</Badge>
                <span className="text-sm font-medium text-mr-navy">{app.formConfig.title}</span>
                <Badge variant="outline" className="text-[10px]">{app.department.name}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {app.evaluation && app.evaluation.status === "completed" && (
                  <ScoreCircle score={app.evaluation.overallScore} size="sm" />
                )}
                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[app.status]}`}>
                  {STATUS_LABELS[app.status]}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-mr-text-muted mt-1">{formatDate(app.submittedAt)}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {app.responses.length > 0 ? (
                app.responses.map((r) => (
                  <div key={r.id} className="border-b border-border/50 pb-2 last:border-0">
                    <p className="text-xs font-medium text-mr-navy">{r.question.questionText}</p>
                    <p className="text-xs text-mr-text-secondary mt-0.5">
                      {r.answerText ||
                        (r.answerJson ? JSON.stringify(r.answerJson) : r.answerFile || "—")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-mr-text-muted">Form yanıtı bulunamadı.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Other Applications */}
        {app.otherApplications && app.otherApplications.length > 0 && (
          <div className="space-y-2">
            {app.otherApplications.map((other) => (
              <Card key={other.id} className="border-gray-200 hover:border-mr-navy/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-mr-navy">{other.formConfig.title}</span>
                      <Badge variant="outline" className="text-[10px]">{other.department.name}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {other.evaluation && other.evaluation.status === "completed" && (
                        <ScoreCircle score={other.evaluation.overallScore} size="sm" />
                      )}
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[other.status]}`}>
                        {STATUS_LABELS[other.status] || other.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-mr-text-muted">{formatDate(other.submittedAt)}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-mr-text-muted hover:text-mr-navy"
                        onClick={() => fetchOtherResponses(other.id)}
                        disabled={loadingResponses === other.id}
                      >
                        {loadingResponses === other.id
                          ? "Yükleniyor..."
                          : expandedResponseId === other.id
                            ? "▲ Yanıtları Gizle"
                            : "▼ Yanıtları Göster"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-mr-navy"
                        onClick={() => router.push(`/admin/basvurular/${other.id}`)}
                      >
                        Detaya Git →
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Responses */}
                {expandedResponseId === other.id && otherResponses[other.id] && (
                  <CardContent className="pt-0 border-t border-border/50">
                    <div className="space-y-2 mt-2">
                      {otherResponses[other.id].length > 0 ? (
                        otherResponses[other.id].map((r) => (
                          <div key={r.id} className="border-b border-border/30 pb-1.5 last:border-0">
                            <p className="text-xs font-medium text-mr-navy">{r.question.questionText}</p>
                            <p className="text-xs text-mr-text-secondary mt-0.5">
                              {r.answerText ||
                                (r.answerJson ? JSON.stringify(r.answerJson) : r.answerFile || "—")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-mr-text-muted">Form yanıtı bulunamadı.</p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════ E-POSTA BİLDİRİM DİALOGU ═══════════════════ */}
      <Dialog open={!!emailPending} onOpenChange={(open) => { if (!open) setEmailPending(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>E-posta Bildirimi Gönder</DialogTitle>
            <DialogDescription>
              <strong>{app.fullName}</strong> adaylığı{" "}
              <strong>
                {emailPending === "shortlisted"
                  ? "ön elemeyi geçti"
                  : emailPending === "rejected"
                    ? "reddedildi"
                    : emailPending === "hired"
                      ? "işe alındı"
                      : emailPending}
              </strong>{" "}
              olarak güncellendi. Adaya durum hakkında e-posta bildirimi gönderilsin mi?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            📧 {app.email}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailPending(null)} disabled={sendingEmail}>
              Geç
            </Button>
            <Button
              onClick={sendEmailNotification}
              disabled={sendingEmail}
              className="bg-mr-navy hover:bg-mr-navy/90"
            >
              {sendingEmail ? "Gönderiliyor..." : "E-posta Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
