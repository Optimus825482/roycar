"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QuestionCard } from "@/components/admin/form-builder/QuestionCard";
import { QuestionEditor } from "@/components/admin/form-builder/QuestionEditor";
import { BranchingRuleEditor } from "@/components/admin/form-builder/BranchingRuleEditor";
import { FormModeToggle } from "@/components/admin/form-builder/FormModeToggle";
import { FlowPreview } from "@/components/admin/form-builder/FlowPreview";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type {
  FormDetail,
  FormQuestion,
  BranchingRule,
} from "@/types/form-builder";

function serialize<T>(data: unknown): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export default function FormEditorPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<FormDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FormQuestion | null>(
    null,
  );
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/forms/${formId}`);
      const json = await res.json();
      if (json.success) {
        const data = serialize<FormDetail>(json.data);
        setForm(data);
        setTitle(data.title);
      } else {
        toast.error("Form bulunamadı.");
        router.push("/admin/form-builder");
      }
    } catch {
      toast.error("Form yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [formId, router]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  async function handleSaveTitle() {
    if (!title.trim() || title === form?.title) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Başlık güncellendi.");
        fetchForm();
      }
    } catch {
      toast.error("Başlık güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleModeChange(mode: "static" | "dynamic") {
    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          `Mod "${mode === "dynamic" ? "Dinamik" : "Statik"}" olarak değiştirildi.`,
        );
        fetchForm();
      }
    } catch {
      toast.error("Mod değiştirilemedi.");
    }
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/forms/${formId}/questions/${qId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Soru silindi.");
        fetchForm();
      } else toast.error(json.error || "Silinemedi.");
    } catch {
      toast.error("Bir hata oluştu.");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !form) return;

    const oldIndex = form.questions.findIndex((q) => q.id === active.id);
    const newIndex = form.questions.findIndex((q) => q.id === over.id);
    const reordered = arrayMove(form.questions, oldIndex, newIndex);
    setForm({ ...form, questions: reordered });

    try {
      await fetch(`/api/admin/forms/${formId}/questions/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });
    } catch {
      toast.error("Sıralama kaydedilemedi.");
      fetchForm();
    }
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch(`/api/admin/forms/${formId}/validate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        const result = json.data;
        if (result.isValid) {
          toast.success("Form akışı geçerli — sorun bulunamadı.");
        } else {
          const msgs: string[] = [];
          if (result.deadEnds?.length)
            msgs.push(`${result.deadEnds.length} çıkmaz yol`);
          if (result.cycles?.length) msgs.push(`${result.cycles.length} döngü`);
          if (result.orphans?.length)
            msgs.push(`${result.orphans.length} erişilemeyen soru`);
          toast.error(`Doğrulama hataları: ${msgs.join(", ")}`);
        }
      }
    } catch {
      toast.error("Doğrulama yapılamadı.");
    } finally {
      setValidating(false);
    }
  }

  function handleEditQuestion(q: FormQuestion) {
    setEditingQuestion(q);
    setEditorOpen(true);
  }

  function handleAddQuestion() {
    setEditingQuestion(null);
    setEditorOpen(true);
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mr-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/form-builder")}
          >
            ← Geri
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveTitle}
              className="text-lg font-semibold border-none bg-transparent px-1 focus-visible:ring-1 max-w-md"
            />
            {form.isPublished && (
              <Badge className="bg-mr-success text-white">Yayında</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FormModeToggle
            mode={form.mode as "static" | "dynamic"}
            onChange={handleModeChange}
          />
          {form.mode === "dynamic" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRuleEditorOpen(true)}
              >
                Dallanma Kuralları ({form.branchingRules?.length || 0})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={validating}
              >
                {validating ? "Doğrulanıyor..." : "Doğrula"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
          >
            Önizle
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-mr-navy">
            Sorular ({form.questions.length})
          </h2>
          <Button
            onClick={handleAddQuestion}
            className="bg-mr-gold hover:bg-mr-gold-dark text-white"
            size="sm"
          >
            + Soru Ekle
          </Button>
        </div>

        {form.questions.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <span className="text-3xl mb-2 block">📋</span>
            <p className="text-mr-text-secondary">Henüz soru eklenmemiş.</p>
            <Button
              onClick={handleAddQuestion}
              variant="outline"
              className="mt-3"
              size="sm"
            >
              İlk Soruyu Ekle
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {form.questions.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    onEdit={() => handleEditQuestion(q)}
                    onDelete={() => handleDeleteQuestion(q.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Question Editor Dialog */}
      <QuestionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        formId={formId}
        question={editingQuestion}
        onSaved={fetchForm}
      />

      {/* Branching Rule Editor Dialog */}
      {form.mode === "dynamic" && (
        <BranchingRuleEditor
          open={ruleEditorOpen}
          onOpenChange={setRuleEditorOpen}
          formId={formId}
          questions={form.questions}
          rules={form.branchingRules || []}
          onSaved={fetchForm}
        />
      )}

      {/* Flow Preview Dialog */}
      <FlowPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        questions={form.questions}
        rules={form.branchingRules || []}
        mode={form.mode as "static" | "dynamic"}
      />
    </div>
  );
}
