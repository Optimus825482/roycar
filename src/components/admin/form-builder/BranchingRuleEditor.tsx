"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type {
  FormQuestion,
  BranchingRule,
  RuleCondition,
} from "@/types/form-builder";

interface BranchingRuleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  questions: FormQuestion[];
  rules: BranchingRule[];
  onSaved: () => void;
}

const OPERATORS: { value: RuleCondition["operator"]; label: string }[] = [
  { value: "equals", label: "Eşittir" },
  { value: "not_equals", label: "Eşit Değil" },
  { value: "contains", label: "İçerir" },
  { value: "greater_than", label: "Büyüktür" },
  { value: "less_than", label: "Küçüktür" },
];

export function BranchingRuleEditor({
  open,
  onOpenChange,
  formId,
  questions,
  rules,
  onSaved,
}: BranchingRuleEditorProps) {
  const [adding, setAdding] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { field: "answer", operator: "equals", value: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setSourceId("");
    setTargetId("");
    setLogic("AND");
    setConditions([{ field: "answer", operator: "equals", value: "" }]);
    setAdding(false);
  }

  function addCondition() {
    setConditions([
      ...conditions,
      { field: "answer", operator: "equals", value: "" },
    ]);
  }

  function removeCondition(idx: number) {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((_, i) => i !== idx));
  }

  function updateCondition(idx: number, patch: Partial<RuleCondition>) {
    const next = [...conditions];
    next[idx] = { ...next[idx], ...patch };
    setConditions(next);
  }

  async function handleSave() {
    if (!sourceId || !targetId) {
      toast.error("Kaynak ve hedef soru seçilmeli.");
      return;
    }
    if (sourceId === targetId) {
      toast.error("Kaynak ve hedef aynı soru olamaz.");
      return;
    }
    const validConditions = conditions.filter((c) => {
      const val = Array.isArray(c.value) ? c.value.join("") : c.value;
      return val.trim().length > 0;
    });
    if (validConditions.length === 0) {
      toast.error("En az bir koşul değeri girilmeli.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceQuestionId: sourceId,
          targetQuestionId: targetId,
          conditionLogic: logic,
          conditions: validConditions,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kural eklendi.");
        resetForm();
        onSaved();
      } else {
        toast.error(json.error || "Kural eklenemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Bu kuralı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/forms/${formId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kural silindi.");
        onSaved();
      } else {
        toast.error(json.error || "Silinemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  }

  function getQuestionLabel(id: string) {
    const q = questions.find((q) => q.id === id);
    return q ? q.questionText : `#${id}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dallanma Kuralları</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing rules */}
          {rules.length === 0 ? (
            <p className="text-sm text-mr-text-muted text-center py-4">
              Henüz dallanma kuralı eklenmemiş.
            </p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-2">
                    <div className="text-sm space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs shrink-0">
                          Kaynak
                        </Badge>
                        <span className="truncate">
                          {getQuestionLabel(rule.sourceQuestionId)}
                        </span>
                      </div>
                      <div className="text-xs text-mr-text-muted">
                        {rule.conditions.map((c, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <Badge variant="outline" className="mx-1 text-xs">
                                {rule.conditionLogic}
                              </Badge>
                            )}
                            {c.operator} &quot;
                            {Array.isArray(c.value)
                              ? c.value.join(", ")
                              : c.value}
                            &quot;
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 bg-mr-gold/10"
                        >
                          Hedef
                        </Badge>
                        <span className="truncate">
                          {getQuestionLabel(rule.targetQuestionId)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-mr-error shrink-0"
                    >
                      Sil
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add new rule */}
          {!adding ? (
            <Button
              variant="outline"
              onClick={() => setAdding(true)}
              className="w-full"
            >
              + Yeni Kural Ekle
            </Button>
          ) : (
            <Card className="border-mr-gold/30">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Kaynak Soru</Label>
                    <Select value={sourceId} onValueChange={setSourceId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.sortOrder + 1}. {q.questionText.slice(0, 40)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Hedef Soru</Label>
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.sortOrder + 1}. {q.questionText.slice(0, 40)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Mantık Operatörü</Label>
                  <Select
                    value={logic}
                    onValueChange={(v) => setLogic(v as "AND" | "OR")}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">VE (AND)</SelectItem>
                      <SelectItem value="OR">VEYA (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Koşullar</Label>
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select
                        value={cond.operator}
                        onValueChange={(v) =>
                          updateCondition(idx, {
                            operator: v as RuleCondition["operator"],
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={
                          Array.isArray(cond.value)
                            ? cond.value.join(", ")
                            : cond.value
                        }
                        onChange={(e) =>
                          updateCondition(idx, { value: e.target.value })
                        }
                        placeholder="Değer"
                        className="flex-1"
                      />
                      {conditions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(idx)}
                          className="text-mr-error"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    + Koşul Ekle
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    İptal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-mr-gold hover:bg-mr-gold-dark text-white"
                  >
                    {saving ? "Kaydediliyor..." : "Kuralı Kaydet"}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
