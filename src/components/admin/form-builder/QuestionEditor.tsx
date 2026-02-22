"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";
import {
  QUESTION_TYPE_LABELS,
  type FormQuestion,
  type QuestionType,
} from "@/types/form-builder";

interface QuestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  question: FormQuestion | null; // null = yeni soru
  onSaved: () => void;
}

const TYPES_WITH_OPTIONS: QuestionType[] = ["select", "radio", "checkbox"];

export function QuestionEditor({
  open,
  onOpenChange,
  formId,
  question,
  onSaved,
}: QuestionEditorProps) {
  const isEdit = !!question;

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("text");
  const [isRequired, setIsRequired] = useState(true);
  const [groupLabel, setGroupLabel] = useState("");
  const [options, setOptions] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (question) {
        setQuestionText(question.questionText);
        setQuestionType(question.questionType);
        setIsRequired(question.isRequired);
        setGroupLabel(question.groupLabel || "");
        setOptions(
          Array.isArray(question.options) && question.options.length > 0
            ? question.options
            : [""],
        );
      } else {
        setQuestionText("");
        setQuestionType("text");
        setIsRequired(true);
        setGroupLabel("");
        setOptions([""]);
      }
    }
  }, [open, question]);

  const hasOptions = TYPES_WITH_OPTIONS.includes(questionType);

  function addOption() {
    setOptions([...options, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, val: string) {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  }

  async function handleSave() {
    if (!questionText.trim()) {
      toast.error("Soru metni gerekli.");
      return;
    }
    if (hasOptions) {
      const validOpts = options.filter((o) => o.trim());
      if (validOpts.length < 2) {
        toast.error("En az 2 seçenek gerekli.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      questionText: questionText.trim(),
      questionType,
      isRequired,
      groupLabel: groupLabel.trim() || null,
      options: hasOptions ? options.filter((o) => o.trim()) : null,
    };

    try {
      const url = isEdit
        ? `/api/admin/forms/${formId}/questions/${question!.id}`
        : `/api/admin/forms/${formId}/questions`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "Soru güncellendi." : "Soru eklendi.");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(json.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Soruyu Düzenle" : "Yeni Soru Ekle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Group Label */}
          <div className="space-y-1">
            <Label htmlFor="groupLabel">Grup / Bölüm Adı (opsiyonel)</Label>
            <Input
              id="groupLabel"
              placeholder="Örn: Kişisel Bilgiler"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-1">
            <Label htmlFor="qText">Soru Metni *</Label>
            <Input
              id="qText"
              placeholder="Sorunuzu yazın..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          {/* Question Type */}
          <div className="space-y-1">
            <Label>Soru Tipi</Label>
            <Select
              value={questionType}
              onValueChange={(v) => setQuestionType(v as QuestionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(QUESTION_TYPE_LABELS) as [
                    QuestionType,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options (for select/radio/checkbox) */}
          {hasOptions && (
            <div className="space-y-2">
              <Label>Seçenekler *</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Seçenek ${idx + 1}`}
                  />
                  {options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(idx)}
                      className="text-mr-error shrink-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}>
                + Seçenek Ekle
              </Button>
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="isRequired" className="cursor-pointer">
              Zorunlu alan
            </Label>
          </div>

          {/* Image uploader (only for existing questions) */}
          {isEdit && question && (
            <ImageUploader
              formId={formId}
              questionId={question.id}
              images={question.images}
              onChanged={onSaved}
            />
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">İptal</Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-mr-gold hover:bg-mr-gold-dark text-white"
          >
            {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
