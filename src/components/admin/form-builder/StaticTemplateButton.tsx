"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText } from "lucide-react";

interface StaticTemplateButtonProps {
  onCreated: () => void;
}

export function StaticTemplateButton({ onCreated }: StaticTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Genel Başvuru Formu");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/forms/seed-static", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          "Statik form şablonu oluşturuldu — 28 hazır soru eklendi.",
        );
        setOpen(false);
        setTitle("Genel Başvuru Formu");
        onCreated();
      } else {
        toast.error(json.error || "Şablon oluşturulamadı.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-mr-navy/20 text-mr-navy hover:bg-mr-navy/5"
      >
        <FileText className="w-4 h-4" />
        Statik Şablon
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Statik Form Şablonu Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-mr-text-secondary">
              Kişisel bilgiler, eğitim, iş deneyimi, yetkinlikler ve referanslar
              gibi temel alanları içeren hazır bir başvuru formu oluşturulacak.
            </p>
            <div className="space-y-2">
              <Label htmlFor="templateTitle">Form Başlığı</Label>
              <Input
                id="templateTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Genel Başvuru Formu"
              />
            </div>
            <div className="text-xs text-mr-text-muted space-y-1">
              <p>Şablon içeriği:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Kişisel Bilgiler (ad, soyad, doğum tarihi, uyruk vb.)</li>
                <li>İletişim Bilgileri (telefon, e-posta, adres)</li>
                <li>Eğitim Bilgileri (okul, bölüm, mezuniyet)</li>
                <li>İş Deneyimi (staj, önceki işler)</li>
                <li>Yetkinlikler (dil, bilgisayar, ehliyet)</li>
                <li>Referanslar</li>
                <li>Ek Bilgiler (departman, fotoğraf, CV)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-mr-navy hover:bg-mr-navy/90 text-white"
            >
              {creating ? "Oluşturuluyor..." : "Şablonu Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
