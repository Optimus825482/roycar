"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { QuestionImage } from "@/types/form-builder";

interface ImageUploaderProps {
  formId: string;
  questionId: string;
  images: QuestionImage[];
  onChanged: () => void;
}

export function ImageUploader({
  formId,
  questionId,
  images,
  onChanged,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Sadece JPEG, PNG veya WebP yüklenebilir.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB'ı aşamaz.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/admin/forms/${formId}/questions/${questionId}/images`,
        { method: "POST", body: formData },
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Görsel yüklendi.");
        onChanged();
      } else {
        toast.error(json.error || "Yükleme başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(imgId: string) {
    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/questions/${questionId}/images/${imgId}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Görsel silindi.");
        onChanged();
      } else toast.error(json.error || "Silinemedi.");
    } catch {
      toast.error("Bir hata oluştu.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-mr-navy">Görseller</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Yükleniyor..." : "+ Görsel Ekle"}
        </Button>
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group w-20 h-20 rounded border overflow-hidden"
            >
              <img
                src={`/${img.filePath}`}
                alt={img.fileName}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-0 right-0 bg-mr-error text-white text-xs w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Görseli sil"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
