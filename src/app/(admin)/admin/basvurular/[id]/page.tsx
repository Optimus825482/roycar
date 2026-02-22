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

interface OtherApplication {
  id: string;
  applicationNo: string;
  status: string;
  submittedAt: string;
  formConfig: { id: string; title: string };
  department: { name: string };
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

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_OPTIONS = ["new", "reviewed", "shortlisted", "rejected", "hired"];

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/applications/${params.id}`);
      const json = await res.json();
      if (json.success) setApp(json.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/applications/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success && app) setApp({ ...app, status: newStatus });
    } catch (err) {
      console.error(err);
    }
    setStatusUpdating(false);
  };

  const retryEvaluation = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/admin/evaluations/${params.id}/retry`, {
        method: "POST",
      });
      setTimeout(fetchDetail, 3000);
    } catch (err) {
      console.error(err);
    }
    setRetrying(false);
  };

  if (loading)
    return (
      <div className="text-center py-12 text-mr-text-muted">Yükleniyor...</div>
    );
  if (!app)
    return (
      <div className="text-center py-12 text-mr-error">Başvuru bulunamadı.</div>
    );

  const report = app.evaluation?.report as EvalReport | null;

  return (
    <div
      className="space-y-6 max-w-4xl"
      role="main"
      aria-label="Başvuru detayı"
    >
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin")}
            className="mb-2"
            aria-label="Dashboard sayfasına dön"
          >
            ← Dashboard
          </Button>
          <h1 className="text-2xl font-heading text-mr-navy">
            {app.fullName}
            {app.otherApplications && app.otherApplications.length > 0 && (
              <Badge className="ml-2 bg-mr-warning text-white text-xs align-middle">
                Çoklu Başvuru ({app.otherApplications.length + 1})
              </Badge>
            )}
          </h1>
          <p className="text-sm text-mr-text-muted">
            {app.applicationNo} · {app.department.name}
          </p>
        </div>
        <Select
          value={app.status}
          onValueChange={updateStatus}
          disabled={statusUpdating}
        >
          <SelectTrigger
            className="w-[160px]"
            aria-label="Başvuru durumunu değiştir"
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

      {/* Candidate Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-mr-text-secondary">
              Aday Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-mr-text-muted">E-posta</span>
              <span>{app.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mr-text-muted">Telefon</span>
              <span>{app.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mr-text-muted">Departman</span>
              <span>{app.department.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mr-text-muted">Başvuru Tarihi</span>
              <span>
                {new Date(app.submittedAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-mr-text-muted">Form</span>
              <span>{app.formConfig.title}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Evaluation Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-mr-text-secondary">
                AI Değerlendirme
              </CardTitle>
              {app.evaluation?.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryEvaluation}
                  disabled={retrying}
                  aria-label="AI değerlendirmesini yeniden dene"
                  aria-busy={retrying}
                >
                  {retrying ? "Deneniyor..." : "Yeniden Dene"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!app.evaluation ? (
              <p className="text-sm text-mr-text-muted">
                Değerlendirme henüz yapılmadı.
              </p>
            ) : app.evaluation.status === "pending" ? (
              <p className="text-sm text-mr-warning">
                Değerlendirme devam ediyor...
              </p>
            ) : app.evaluation.status === "failed" ? (
              <p className="text-sm text-mr-error">
                Değerlendirme başarısız. ({app.evaluation.retryCount} deneme)
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-bold text-mr-navy">
                    {app.evaluation.overallScore}
                  </div>
                  <div className="text-sm text-mr-text-muted">/100 puan</div>
                  {report?.recommendation && (
                    <Badge
                      variant={
                        report.recommendation === "reject"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {report.recommendation === "shortlist"
                        ? "Ön Eleme"
                        : report.recommendation === "interview"
                          ? "Mülakata Çağır"
                          : "Reddet"}
                    </Badge>
                  )}
                </div>
                {report?.summary && <p className="text-sm">{report.summary}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed AI Report */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-mr-text-secondary">
              Detaylı AI Raporu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.strengths?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-mr-success mb-1">
                  Güçlü Yönler
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {report.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.weaknesses?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-mr-error mb-1">
                  Zayıf Yönler / Riskler
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {report.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.fitAnalysis && (
              <div>
                <h3 className="text-sm font-medium text-mr-navy mb-1">
                  Pozisyon Uyumu
                </h3>
                <p className="text-sm">{report.fitAnalysis}</p>
              </div>
            )}
            {report.recommendationReason && (
              <div>
                <h3 className="text-sm font-medium text-mr-navy mb-1">
                  Öneri Gerekçesi
                </h3>
                <p className="text-sm">{report.recommendationReason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other Applications by Same Candidate */}
      {app.otherApplications && app.otherApplications.length > 0 && (
        <Card className="border-mr-warning/30 bg-mr-warning/5">
          <CardHeader>
            <CardTitle className="text-sm text-mr-warning flex items-center gap-2">
              <span>⚠️</span>
              Bu Adayın Diğer Başvuruları ({app.otherApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {app.otherApplications.map((other) => (
                <div
                  key={other.id}
                  className="flex items-center justify-between p-2 rounded-md bg-white border text-sm"
                >
                  <div>
                    <span className="font-medium text-mr-navy">
                      {other.formConfig.title}
                    </span>
                    <span className="text-mr-text-muted ml-2">
                      · {other.department.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[other.status] || other.status}
                    </Badge>
                    <span className="text-xs text-mr-text-muted">
                      {new Date(other.submittedAt).toLocaleDateString("tr-TR")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() =>
                        router.push(`/admin/basvurular/${other.id}`)
                      }
                    >
                      Görüntüle →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-mr-text-secondary">
            Başvuru Yanıtları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {app.responses.map((r) => (
              <div
                key={r.id}
                className="border-b border-border pb-3 last:border-0"
              >
                <p className="text-sm font-medium text-mr-navy">
                  {r.question.questionText}
                </p>
                <p className="text-sm text-mr-text-secondary mt-1">
                  {r.answerText ||
                    (r.answerJson
                      ? JSON.stringify(r.answerJson)
                      : r.answerFile || "—")}
                </p>
              </div>
            ))}
            {app.responses.length === 0 && (
              <p className="text-sm text-mr-text-muted">Yanıt bulunamadı.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
