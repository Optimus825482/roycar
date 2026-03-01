"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AppLoader } from "@/components/shared/AppLoader";
import {
  exportListToPDF,
  exportListToExcel,
  printListEvaluation,
} from "@/lib/export-utils";
import type { ListExportItem } from "@/lib/export-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/* ─── Types ─── */

interface CandidateGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

interface GroupMember {
  id: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  department: string;
  notes: string | null;
  addedAt: string;
  evaluation: {
    id: string;
    overallScore: number;
    status: string;
    report: Record<string, unknown>;
    customCriteria: unknown;
    evaluationLabel: string | null;
    evaluatedAt: string | null;
  } | null;
  evaluationSession: {
    id: string;
    label: string | null;
    criteria: unknown;
  } | null;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: GroupMember[];
}

/* ─── Constants ─── */

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white",
  reviewed: "bg-amber-500 text-white",
  shortlisted: "bg-emerald-600 text-white",
  rejected: "bg-red-600 text-white",
  hired: "bg-green-600 text-white",
};

/* ─── Page ─── */

export default function CandidateGroupsPage() {
  const [groups, setGroups] = useState<CandidateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create group modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit group modal
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/candidate-groups");
      const json = await res.json();
      if (json.success) setGroups(json.data);
    } catch {
      toast.error("Gruplar yüklenemedi");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const fetchGroupDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/candidate-groups/${id}`);
      const json = await res.json();
      if (json.success) setSelectedGroup(json.data);
    } catch {
      toast.error("Grup detayı yüklenemedi");
    }
    setDetailLoading(false);
  }, []);

  const createGroup = async () => {
    if (!createName.trim()) {
      toast.error("Grup adı zorunludur");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/candidate-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDesc }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Grup oluşturuldu");
        setShowCreate(false);
        setCreateName("");
        setCreateDesc("");
        fetchGroups();
      } else {
        toast.error(json.error || "Grup oluşturulamadı");
      }
    } catch {
      toast.error("Grup oluşturulamadı");
    }
    setCreating(false);
  };

  const updateGroup = async () => {
    if (!selectedGroup || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/candidate-groups/${selectedGroup.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName, description: editDesc }),
        },
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Grup güncellendi");
        setShowEdit(false);
        fetchGroups();
        fetchGroupDetail(selectedGroup.id);
      }
    } catch {
      toast.error("Grup güncellenemedi");
    }
    setSaving(false);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Bu grubu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/candidate-groups/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Grup silindi");
        if (selectedGroup?.id === id) setSelectedGroup(null);
        fetchGroups();
      }
    } catch {
      toast.error("Grup silinemedi");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(
        `/api/admin/candidate-groups/${selectedGroup.id}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        },
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Aday gruptan çıkarıldı");
        fetchGroupDetail(selectedGroup.id);
        fetchGroups();
      }
    } catch {
      toast.error("Aday çıkarılamadı");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Convert group members to export format
  const getExportItems = useCallback((): ListExportItem[] => {
    if (!selectedGroup) return [];
    return selectedGroup.members.map((m) => ({
      fullName: m.fullName,
      email: m.email,
      phone: m.phone || "",
      department: m.department || "—",
      positionTitle: "",
      overallScore: m.evaluation?.overallScore ?? 0,
      recommendation: null,
      finalDecision: null,
      manualNote: m.notes,
    }));
  }, [selectedGroup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AppLoader size="lg" text="Gruplar yükleniyor..." variant="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-mr-navy">Aday Grupları</h1>
          <p className="text-sm text-mr-text-muted mt-0.5">
            Adayları gruplara ayırarak yönetin
          </p>
        </div>
        <Button
          className="bg-mr-navy hover:bg-mr-navy/90 text-white cursor-pointer"
          onClick={() => setShowCreate(true)}
        >
          + Grup Oluştur
        </Button>
      </div>

      {/* Main Layout: Groups List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sol Panel — Grup Listesi */}
        <div className="lg:col-span-1 space-y-3">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-mr-text-secondary">
                  Henüz grup oluşturulmamış.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowCreate(true)}
                >
                  İlk Grubu Oluştur
                </Button>
              </CardContent>
            </Card>
          ) : (
            groups.map((g) => (
              <Card
                key={g.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedGroup?.id === g.id
                    ? "ring-2 ring-mr-navy/40 shadow-md"
                    : ""
                }`}
                onClick={() => fetchGroupDetail(g.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-mr-navy truncate">
                        {g.name}
                      </h3>
                      {g.description && (
                        <p className="text-xs text-mr-text-secondary truncate mt-0.5">
                          {g.description}
                        </p>
                      )}
                      <p className="text-xs text-mr-text-secondary mt-1">
                        {formatDate(g.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="secondary" className="text-xs">
                        {g.memberCount} aday
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteGroup(g.id);
                        }}
                        title="Grubu Sil"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sağ Panel — Grup Detayı */}
        <div className="lg:col-span-2">
          {!selectedGroup ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-mr-text-secondary">
                  Detayları görmek için sol taraftan bir grup seçin.
                </p>
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AppLoader size="md" variant="spinner" text="Yükleniyor..." />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-mr-navy">
                      {selectedGroup.name}
                    </CardTitle>
                    {selectedGroup.description && (
                      <p className="text-sm text-mr-text-secondary mt-0.5">
                        {selectedGroup.description}
                      </p>
                    )}
                    <p className="text-xs text-mr-text-secondary mt-1">
                      Oluşturulma: {formatDate(selectedGroup.createdAt)} ·{" "}
                      {selectedGroup.members.length} aday
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = getExportItems();
                        if (items.length === 0) {
                          toast.warning("Dışa aktarılacak aday yok");
                          return;
                        }
                        printListEvaluation(items);
                      }}
                      disabled={selectedGroup.members.length === 0}
                      title="Yazdır"
                    >
                      🖨️ Yazdır
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = getExportItems();
                        if (items.length === 0) {
                          toast.warning("Dışa aktarılacak aday yok");
                          return;
                        }
                        exportListToPDF(items);
                      }}
                      disabled={selectedGroup.members.length === 0}
                      title="PDF İndir"
                    >
                      📄 PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const items = getExportItems();
                        if (items.length === 0) {
                          toast.warning("Dışa aktarılacak aday yok");
                          return;
                        }
                        void exportListToExcel(items);
                      }}
                      disabled={selectedGroup.members.length === 0}
                      title="Excel İndir"
                    >
                      📊 Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditName(selectedGroup.name);
                        setEditDesc(selectedGroup.description || "");
                        setShowEdit(true);
                      }}
                    >
                      ✏️ Düzenle
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedGroup.members.length === 0 ? (
                  <p className="text-sm text-mr-text-secondary text-center py-6">
                    Bu grupta henüz aday yok. Değerlendirme sonucunda adayları
                    buraya ekleyebilirsiniz.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-mr-text-secondary">
                          <th className="pb-2 pr-3">Ad Soyad</th>
                          <th className="pb-2 pr-3">E-posta</th>
                          <th className="pb-2 pr-3">Departman</th>
                          <th className="pb-2 pr-3">Durum</th>
                          <th className="pb-2 pr-3">Puan</th>
                          <th className="pb-2 pr-3">Değerlendirme</th>
                          <th className="pb-2 pr-3">Eklenme</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.members.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b last:border-0 hover:bg-mr-bg-secondary/30"
                          >
                            <td className="py-2.5 pr-3 font-medium text-mr-navy">
                              {m.fullName}
                            </td>
                            <td className="py-2.5 pr-3 text-mr-text-secondary">
                              {m.email}
                            </td>
                            <td className="py-2.5 pr-3 text-mr-text-secondary">
                              {m.department || "—"}
                            </td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                  STATUS_COLORS[m.status] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {STATUS_LABELS[m.status] || m.status}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3">
                              {m.evaluation ? (
                                <span
                                  className={`font-bold ${
                                    m.evaluation.overallScore >= 75
                                      ? "text-emerald-600"
                                      : m.evaluation.overallScore >= 50
                                        ? "text-amber-600"
                                        : "text-red-600"
                                  }`}
                                >
                                  {m.evaluation.overallScore}
                                </span>
                              ) : (
                                <span className="text-mr-text-secondary">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-mr-text-secondary">
                              {m.evaluationSession?.label ||
                                m.evaluation?.evaluationLabel ||
                                "—"}
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-mr-text-secondary">
                              {formatDate(m.addedAt)}
                            </td>
                            <td className="py-2.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeMember(m.id)}
                                title="Gruptan Çıkar"
                              >
                                ✕
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══ Grup Oluştur Dialog ═══ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Grup Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Grup Adı *
              </label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Örn: Mutfak Ekibi Adayları"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Açıklama (opsiyonel)
              </label>
              <Textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Grup hakkında kısa açıklama..."
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
              onClick={createGroup}
              disabled={creating || !createName.trim()}
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Grup Düzenle Dialog ═══ */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grubu Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Grup Adı *
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Grup adı"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-mr-navy block mb-1">
                Açıklama (opsiyonel)
              </label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Grup hakkında kısa açıklama..."
                rows={3}
              />
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
              onClick={updateGroup}
              disabled={saving || !editName.trim()}
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
