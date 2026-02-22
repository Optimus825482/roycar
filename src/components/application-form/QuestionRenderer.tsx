"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";

interface QuestionImage {
  id: string;
  filePath: string;
  fileName: string;
  sortOrder: number;
}

interface QuestionRendererProps {
  question: {
    id: string;
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options: string[] | null;
    images: QuestionImage[];
    metadata: Record<string, unknown> | null;
  };
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  error?: string;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  error,
}: QuestionRendererProps) {
  const inputId = `question-${question.id}`;

  const renderInput = () => {
    switch (question.questionType) {
      case "text":
        return (
          <Input
            id={inputId}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              (question.metadata?.placeholder as string) ||
              "Yanıtınızı yazın..."
            }
            className="text-base h-12"
            aria-required={question.isRequired}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={inputId}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              (question.metadata?.placeholder as string) ||
              "Yanıtınızı yazın..."
            }
            rows={4}
            className="text-base"
            aria-required={question.isRequired}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        );

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger
              className="h-12 text-base"
              id={inputId}
              aria-required={question.isRequired}
              aria-invalid={!!error}
            >
              <SelectValue placeholder="Seçiniz..." />
            </SelectTrigger>
            <SelectContent>
              {(question.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <fieldset aria-required={question.isRequired} aria-invalid={!!error}>
            <legend className="sr-only">{question.questionText}</legend>
            <div className="space-y-3" role="radiogroup">
              {(question.options || []).map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-mr-gold focus-within:ring-offset-2 ${
                    value === opt
                      ? "border-mr-gold bg-mr-gold/5"
                      : "border-border hover:border-mr-gold/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={opt}
                    checked={value === opt}
                    onChange={() => onChange(opt)}
                    className="w-4 h-4 accent-mr-gold"
                  />
                  <span className="text-base">{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );

      case "checkbox":
        return (
          <fieldset aria-required={question.isRequired} aria-invalid={!!error}>
            <legend className="sr-only">{question.questionText}</legend>
            <div className="space-y-3" role="group">
              {(question.options || []).map((opt) => {
                const selected = Array.isArray(value) ? value : [];
                const isChecked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-mr-gold focus-within:ring-offset-2 ${
                      isChecked
                        ? "border-mr-gold bg-mr-gold/5"
                        : "border-border hover:border-mr-gold/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={opt}
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selected.filter((s) => s !== opt)
                          : [...selected, opt];
                        onChange(next.length > 0 ? next : null);
                      }}
                      className="w-4 h-4 accent-mr-gold"
                    />
                    <span className="text-base">{opt}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );

      case "date":
        return (
          <Input
            id={inputId}
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="text-base h-12"
            aria-required={question.isRequired}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
        );

      case "file":
        return (
          <div className="space-y-2">
            <Input
              id={inputId}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                onChange(file ? file.name : null);
              }}
              className="text-base h-12 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-mr-navy file:text-white hover:file:bg-mr-navy-light"
              data-file-input={question.id}
              aria-required={question.isRequired}
              aria-describedby={value ? `${inputId}-selected` : undefined}
            />
            {value && (
              <p
                id={`${inputId}-selected`}
                className="text-sm text-mr-text-muted"
              >
                Seçilen: {value as string}
              </p>
            )}
          </div>
        );

      default:
        return (
          <Input
            id={inputId}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="text-base h-12"
            aria-required={question.isRequired}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Soru görselleri */}
      {question.images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {question.images.map((img) => (
            <div
              key={img.id}
              className="relative flex-shrink-0 w-full max-w-md rounded-lg overflow-hidden border"
            >
              <Image
                src={`/${img.filePath}`}
                alt={`${question.questionText} - görsel ${img.sortOrder + 1}`}
                width={600}
                height={400}
                className="object-contain w-full h-auto"
              />
            </div>
          ))}
        </div>
      )}

      {/* Soru metni */}
      <Label
        htmlFor={inputId}
        className="text-lg font-medium text-mr-navy block"
      >
        {question.questionText}
        {question.isRequired && (
          <>
            <span className="text-mr-error ml-1" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(zorunlu)</span>
          </>
        )}
      </Label>

      {/* Input */}
      {renderInput()}

      {/* Hata mesajı */}
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-mr-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
