"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ShareFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formTitle: string;
}

export function ShareFormDialog({
  open,
  onOpenChange,
  formTitle,
}: ShareFormDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);

  const formUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/basvuru`
      : "/basvuru";

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/apply/qrcode`
      : "/api/apply/qrcode";

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(formUrl);
      toast.success("Link kopyalandı.");
    } catch {
      toast.error("Link kopyalanamadı.");
    }
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(
      `F&B Career System — Kariyer\n\n${formTitle}\n\nBaşvurmak için:\n${formUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function handleSendEmail() {
    const emails = emailInput
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error("En az bir e-posta adresi girin.");
      return;
    }

    const invalidEmails = emails.filter(
      (e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
    );
    if (invalidEmails.length > 0) {
      toast.error(`Geçersiz adres: ${invalidEmails.join(", ")}`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/forms/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, formTitle, formUrl }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "E-postalar gönderildi.");
        setEmailInput("");
      } else {
        toast.error(json.error || "Gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadQR() {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "basvuru-qr-kod.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR kod indirildi.");
    } catch {
      toast.error("QR kod indirilemedi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Formu Paylaş</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* QR Kod */}
          <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-mr-navy">QR Kod</p>
            <Image
              src={qrUrl}
              alt="Başvuru formu QR kodu"
              width={200}
              height={200}
              className="rounded-lg border"
              unoptimized
            />
            <Button variant="outline" size="sm" onClick={handleDownloadQR}>
              📥 QR Kodu İndir
            </Button>
          </div>

          {/* Link Kopyala */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-mr-navy">
              Başvuru Linki
            </Label>
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="text-sm bg-gray-50" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                📋 Kopyala
              </Button>
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <Button
              variant="outline"
              className="w-full gap-2 text-green-700 border-green-300 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp ile Paylaş
            </Button>
          </div>

          {/* E-posta Gönder */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-mr-navy">
              E-posta ile Gönder
            </Label>
            <p className="text-xs text-mr-text-muted">
              Birden fazla adres için virgül veya noktalı virgül kullanın.
            </p>
            <div className="flex gap-2">
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ornek@email.com, diger@email.com"
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={sending}
                className="shrink-0"
              >
                {sending ? "Gönderiliyor..." : "📧 Gönder"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
