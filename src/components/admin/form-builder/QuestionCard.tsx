"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_LABELS, type FormQuestion } from "@/types/form-builder";

interface QuestionCardProps {
  question: FormQuestion;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="group">
      <CardContent className="p-4 flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-mr-text-muted hover:text-mr-navy p-1 shrink-0"
          aria-label="Sürükle"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Index */}
        <span className="text-xs font-mono text-mr-text-muted w-6 text-center shrink-0">
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {question.groupLabel && (
            <span className="text-xs text-mr-gold font-medium">
              {question.groupLabel}
            </span>
          )}
          <p className="text-sm font-medium text-mr-navy truncate">
            {question.questionText}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {QUESTION_TYPE_LABELS[question.questionType] ||
                question.questionType}
            </Badge>
            {question.isRequired && (
              <Badge
                variant="outline"
                className="text-xs text-mr-error border-mr-error"
              >
                Zorunlu
              </Badge>
            )}
            {question.images.length > 0 && (
              <Badge
                variant="outline"
                className="text-xs text-mr-info border-mr-info"
              >
                {question.images.length} görsel
              </Badge>
            )}
            {question.options && Array.isArray(question.options) && (
              <span className="text-xs text-mr-text-muted">
                {question.options.length} seçenek
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-mr-navy"
          >
            Düzenle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-mr-error"
          >
            Sil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
