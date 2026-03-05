"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ShareFormDialog } from "@/components/admin/form-builder/ShareFormDialog";
import { StaticTemplateButton } from "@/components/admin/form-builder/StaticTemplateButton";
import { FormAiAssistant } from "@/components/admin/form-builder/FormAiAssistant";
import type { FormListItem } from "@/types/form-builder";

// BigInt JSON serialization helper
function serialize(data: unknown): FormListItem[] {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export default function FormBuilderPage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMode, setNewMode] = useState<"static" | "dynamic">("static");
  const [creating, setCreating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFormTitle, setShareFormTitle] = useState("");

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/forms");
      const json = await res.json();
      if (json.success) setForms(serialize(json.data));
    } catch {
      toast.error("Formlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  async function handleCreate() {
    if (!newTitle.trim()) {
      toast.error("Form başlığı gerekli.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), mode: newMode }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Form oluşturuldu.");
        setCreateOpen(false);
        setNewTitle("");
        setNewMode("static");
        fetchForms();
      } else {
        toast.error(json.error || "Form oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu formu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/forms/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Form silindi.");
        fetchForms();
      } else toast.error(json.error || "Silinemedi.");
    } catch {
      toast.error("Bir hata oluştu.");
    }
  }

  async function handlePublish(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/forms/${id}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          current ? "Form yayından kaldırıldı." : "Form yayınlandı.",
        );
        fetchForms();
      } else toast.error(json.error || "İşlem başarısız.");
    } catch {
      toast.error("Bir hata oluştu.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mr-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-mr-navy">Form Builder</h1>
          <p className="text-sm text-mr-text-secondary mt-1">
            Başvuru formlarını oluşturun ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StaticTemplateButton onCreated={fetchForms} />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-mr-gold hover:bg-mr-gold-dark text-white">
                + Yeni Form
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Form Oluştur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Form Başlığı</Label>
                  <Input
                    id="title"
                    placeholder="Örn: 2026 Yaz Sezonu Başvuru Formu"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">Form Modu</Label>
                  <Select
                    value={newMode}
                    onValueChange={(v) => setNewMode(v as "static" | "dynamic")}
                  >
                    <SelectTrigger id="mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">
                        Statik (Tüm sorular sıralı)
                      </SelectItem>
                      <SelectItem value="dynamic">
                        Dinamik (Koşullu dallanma)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">İptal</Button>
                </DialogClose>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="bg-mr-gold hover:bg-mr-gold-dark text-white"
                >
                  {creating ? "Oluşturuluyor..." : "Oluştur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">📝</span>
            <p className="text-mr-text-secondary">Henüz form oluşturulmamış.</p>
            <p className="text-sm text-mr-text-muted mt-1">
              Yukarıdaki &quot;Yeni Form&quot; butonuyla başlayın.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-mr-navy line-clamp-2">
                    {form.title}
                  </h3>
                  <div className="flex gap-1 ml-2 shrink-0">
                    {form.isPublished && (
                      <Badge className="bg-mr-success text-white text-xs">
                        Yayında
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {form.mode === "dynamic" ? "Dinamik" : "Statik"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-mr-text-muted">
                  <span>{form._count.questions} soru</span>
                  <span>{form._count.applications} başvuru</span>
                </div>
                <p className="text-xs text-mr-text-muted">
                  {new Date(form.createdAt).toLocaleDateString("tr-TR")}
                </p>
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Link
                    href={`/admin/form-builder/${form.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      Düzenle
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePublish(form.id, form.isPublished)}
                    className={
                      form.isPublished
                        ? "text-mr-warning border-mr-warning"
                        : "text-mr-success border-mr-success"
                    }
                  >
                    {form.isPublished ? "Kaldır" : "Yayınla"}
                  </Button>
                  {form.isPublished && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShareFormTitle(form.title);
                        setShareOpen(true);
                      }}
                      className="text-mr-navy border-mr-navy"
                    >
                      Paylaş
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(form.id)}
                    className="text-mr-error border-mr-error"
                    disabled={form._count.applications > 0}
                    title={
                      form._count.applications > 0
                        ? "Başvurusu olan form silinemez"
                        : ""
                    }
                  >
                    Sil
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShareFormDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        formTitle={shareFormTitle}
      />

      {/* AI Asistan — standalone mod, konuşarak form oluşturma */}
      <FormAiAssistant standalone onFormCreated={() => fetchForms()} />
    </div>
  );
}
