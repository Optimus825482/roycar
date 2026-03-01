"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

// ─── Types ───

interface EvalSession {
  id: string;
  label: string | null;
  description: string | null;
  status: string;
  evaluationCount: number;
  createdBy: { id: string; fullName: string; username: string } | null;
  createdAt: string;
  updatedAt: string;
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

// ─── Component ───

export default function EvaluationSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<EvalSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Yeni oturum modal
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/evaluation-sessions");
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } catch {
      toast.error("Oturumlar yüklenemedi");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = async () => {
    if (!newLabel.trim()) {
      toast.error("Değerlendirme adı zorunludur");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/evaluation-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          description: newDesc.trim() || null,
          status: "draft",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Değerlendirme oluşturuldu");
        setShowCreate(false);
        setNewLabel("");
        setNewDesc("");
        router.push(`/admin/on-eleme/${json.data.id}`);
      } else {
        toast.error(json.error || "Oluşturulamadı");
      }
    } catch {
      toast.error("Bağlantı hatası");
    }
    setCreating(false);
  };

  const deleteSession = async (
    id: string,
    name: string,
    candidateCount: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const msg =
      candidateCount > 0
        ? `"${name}" değerlendirmesini ve ${candidateCount} aday sonucunu kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
        : `"${name}" değerlendirmesini silmek istediğinize emin misiniz?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/admin/evaluation-sessions/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        const deleted = json.data?.deletedEvaluations || 0;
        toast.success(
          deleted > 0
            ? `Değerlendirme ve ${deleted} sonuç silindi`
            : "Değerlendirme silindi",
        );
        fetchSessions();
      } else {
        toast.error(json.error || "Silinemedi");
      }
    } catch {
      toast.error("Silme hatası");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AppLoader size="lg" variant="spinner" text="Yükleniyor..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-mr-navy">
            Başvuru Değerlendirme
          </h1>
          <p className="text-sm text-mr-text-secondary mt-1">
            Değerlendirme oturumlarını yönetin, yeni değerlendirme oluşturun
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-mr-navy hover:bg-mr-navy/90 text-white"
        >
          + Yeni Değerlendirme
        </Button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-mr-navy">
              {sessions.length}
            </div>
            <div className="text-xs text-mr-text-secondary">
              Toplam Değerlendirme
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-emerald-600">
              {
                sessions.filter(
                  (s) => s.status === "completed" || s.status === "active",
                ).length
              }
            </div>
            <div className="text-xs text-mr-text-secondary">Tamamlanan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-amber-600">
              {
                sessions.filter(
                  (s) =>
                    s.status === "draft" ||
                    s.status === "screening" ||
                    s.status === "evaluating",
                ).length
              }
            </div>
            <div className="text-xs text-mr-text-secondary">Devam Eden</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-2xl font-bold text-blue-600">
              {sessions.reduce((sum, s) => sum + s.evaluationCount, 0)}
            </div>
            <div className="text-xs text-mr-text-secondary">Toplam Aday</div>
          </CardContent>
        </Card>
      </div>

      {/* Değerlendirmeler Tablosu */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-mr-text-secondary mb-4">
              Henüz değerlendirme oluşturulmamış.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
            >
              İlk Değerlendirmeyi Oluştur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-mr-bg-secondary/50">
                  <th className="text-left px-4 py-3 font-medium text-mr-text-secondary">
                    Tarih
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-mr-text-secondary">
                    Değerlendirme Adı
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-mr-text-secondary">
                    Açıklama
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-mr-text-secondary">
                    Durum
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-mr-text-secondary">
                    Aday Sayısı
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-mr-text-secondary">
                    Oluşturan
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-mr-text-secondary">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = STATUS_MAP[s.status] || STATUS_MAP.active;
                  return (
                    <tr
                      key={s.id}
                      className="border-b hover:bg-mr-bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/on-eleme/${s.id}`)}
                    >
                      <td className="px-4 py-3 text-mr-text-secondary whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-mr-navy">
                        {s.label || "İsimsiz Değerlendirme"}
                      </td>
                      <td className="px-4 py-3 text-mr-text-secondary max-w-[200px] truncate">
                        {s.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {s.evaluationCount}
                      </td>
                      <td className="px-4 py-3 text-mr-text-secondary text-xs">
                        {s.createdBy?.fullName || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 px-2"
                          onClick={(e) =>
                            deleteSession(
                              s.id,
                              s.label || "İsimsiz",
                              s.evaluationCount,
                              e,
                            )
                          }
                        >
                          🗑️ Sil
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ═══ Yeni Değerlendirme Oluştur Dialog ═══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Değerlendirme Oluştur</DialogTitle>
            <DialogDescription>
              Değerlendirme adı ve açıklaması girin. Kaydettikten sonra detay
              sayfasında adayları ekleyip değerlendirebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Değerlendirme Adı *
              </label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Örn: Mutfak Ekibi - Mart 2026"
                onKeyDown={(e) => e.key === "Enter" && createSession()}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Açıklama
              </label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Bu değerlendirme hakkında kısa not..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              İptal
            </Button>
            <Button
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
              onClick={createSession}
              disabled={creating || !newLabel.trim()}
            >
              {creating ? "Oluşturuluyor..." : "Oluştur ve Devam Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
