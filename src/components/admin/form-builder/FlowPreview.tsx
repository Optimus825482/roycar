"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QUESTION_TYPE_LABELS,
  type FormQuestion,
  type BranchingRule,
} from "@/types/form-builder";

interface FlowPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: FormQuestion[];
  rules: BranchingRule[];
  mode: "static" | "dynamic";
}

export function FlowPreview({
  open,
  onOpenChange,
  questions,
  rules,
  mode,
}: FlowPreviewProps) {
  // Build adjacency for dynamic mode
  const rulesBySource = new Map<string, BranchingRule[]>();
  for (const rule of rules) {
    const existing = rulesBySource.get(rule.sourceQuestionId) || [];
    existing.push(rule);
    rulesBySource.set(rule.sourceQuestionId, existing);
  }

  function getQuestionLabel(id: string) {
    const q = questions.find((q) => q.id === id);
    return q ? `${q.sortOrder + 1}. ${q.questionText}` : `#${id}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Form Akış Önizleme
            <Badge variant="outline" className="ml-2 text-xs">
              {mode === "dynamic" ? "Dinamik" : "Statik"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {questions.length === 0 ? (
            <p className="text-sm text-mr-text-muted text-center py-8">
              Henüz soru eklenmemiş.
            </p>
          ) : (
            questions.map((q, idx) => {
              const qRules = rulesBySource.get(q.id) || [];
              return (
                <div key={q.id} className="relative">
                  {/* Question node */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-mr-navy text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-mr-navy truncate">
                        {q.questionText}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[q.questionType] ||
                            q.questionType}
                        </Badge>
                        {q.isRequired && (
                          <span className="text-xs text-mr-error">Zorunlu</span>
                        )}
                        {q.images.length > 0 && (
                          <span className="text-xs text-mr-info">
                            {q.images.length} görsel
                          </span>
                        )}
                      </div>

                      {/* Branching rules from this question */}
                      {mode === "dynamic" && qRules.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {qRules.map((rule) => (
                            <div
                              key={rule.id}
                              className="text-xs bg-mr-gold/10 border border-mr-gold/20 rounded px-2 py-1"
                            >
                              <span className="text-mr-gold-dark font-medium">
                                →{" "}
                              </span>
                              {rule.conditions.map((c, ci) => (
                                <span key={ci}>
                                  {ci > 0 && (
                                    <span className="font-medium text-mr-navy">
                                      {" "}
                                      {rule.conditionLogic}{" "}
                                    </span>
                                  )}
                                  {c.operator} &quot;
                                  {Array.isArray(c.value)
                                    ? c.value.join(", ")
                                    : c.value}
                                  &quot;
                                </span>
                              ))}
                              <span className="text-mr-gold-dark font-medium">
                                {" "}
                                → {getQuestionLabel(rule.targetQuestionId)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connector line */}
                  {idx < questions.length - 1 && (
                    <div className="flex justify-center">
                      <div className="w-px h-4 bg-border" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* End node */}
          {questions.length > 0 && (
            <div className="flex justify-center pt-2">
              <div className="px-4 py-2 rounded-full bg-mr-success/10 border border-mr-success/30 text-sm text-mr-success font-medium">
                Form Sonu — Başvuru Gönder
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
