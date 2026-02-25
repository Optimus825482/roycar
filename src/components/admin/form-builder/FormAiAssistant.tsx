"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  Check,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { FormQuestion, BranchingRule } from "@/types/form-builder";

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  formPlanReady?: boolean;
}

interface AiFormPlan {
  title: string;
  mode: "static" | "dynamic";
  questions: AiFormQuestion[];
}

interface AiFormQuestion {
  groupLabel: string;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  options?: string[];
}

interface FormAiAssistantProps {
  formId?: string;
  formTitle?: string;
  formMode?: "static" | "dynamic";
  questions?: FormQuestion[];
  rules?: BranchingRule[];
  /** standalone mode — form builder ana sayfasından açılır, formId olmadan */
  standalone?: boolean;
  onFormCreated?: (formId: string) => void;
}

export function FormAiAssistant({
  formId,
  formTitle,
  formMode,
  questions = [],
  rules = [],
  standalone = false,
  onFormCreated,
}: FormAiAssistantProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [formPlan, setFormPlan] = useState<AiFormPlan | null>(null);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveChoice, setSaveChoice] = useState<"update" | "create" | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Build form context for AI
  function buildFormContext(): string {
    if (standalone && questions.length === 0) {
      return "Henüz form oluşturulmamış. Kullanıcı yeni bir form oluşturmak istiyor.";
    }

    const qList = questions
      .map(
        (q, i) =>
          `${i + 1}. [${q.questionType}${q.isRequired ? ", zorunlu" : ""}] ${q.questionText}${q.groupLabel ? ` (Grup: ${q.groupLabel})` : ""}${q.options ? ` Seçenekler: ${q.options.join(", ")}` : ""}`,
      )
      .join("\n");

    const rList =
      rules.length > 0
        ? rules
            .map((r) => {
              const src = questions.find((q) => q.id === r.sourceQuestionId);
              const tgt = questions.find((q) => q.id === r.targetQuestionId);
              return `- "${src?.questionText || "?"}" → "${tgt?.questionText || "?"}" (${r.conditions.map((c) => `${c.operator} "${c.value}"`).join(` ${r.conditionLogic} `)})`;
            })
            .join("\n")
        : "Henüz dallanma kuralı yok.";

    return `Form: "${formTitle || "Yeni Form"}" (${formMode === "dynamic" ? "Dinamik" : "Statik"} mod)
Soru sayısı: ${questions.length}

Mevcut Sorular:
${qList || "Henüz soru eklenmemiş."}

Dallanma Kuralları:
${rList}`;
  }

  // Detect [FORM_PLAN_READY] tag in AI response
  function detectFormPlanReady(content: string): {
    cleanContent: string;
    ready: boolean;
  } {
    const tag = "[FORM_PLAN_READY]";
    if (content.includes(tag)) {
      return {
        cleanContent: content.replace(tag, "").trim(),
        ready: true,
      };
    }
    return { cleanContent: content, ready: false };
  }

  // Generate form plan via AI
  async function handleGenerateForm(description?: string) {
    const desc =
      description ||
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");

    if (!desc.trim()) {
      toast.error("Form açıklaması gerekli.");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/forms/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          description: desc,
          formContext: !standalone && formId ? buildFormContext() : undefined,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await res.json();
      if (json.success && json.data.type === "form_plan" && json.data.plan) {
        setFormPlan(json.data.plan);
        setPlanExpanded(true);

        const aiMsg: AiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: `"${json.data.plan.title}" başlıklı ${json.data.plan.questions.length} soruluk bir form planı hazırladım. Aşağıda önizleyebilirsiniz. Beğenirseniz "Onayla ve Oluştur" butonuna tıklayın, değişiklik isterseniz bana söyleyin.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else if (json.success && json.data.type === "text") {
        const aiMsg: AiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content:
            json.data.content ||
            "Form planı oluşturulamadı. Lütfen daha detaylı açıklama yapın.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error("Form planı oluşturulamadı.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setGenerating(false);
    }
  }

  // Save the approved form plan — update existing or create new
  async function handleSaveFormPlan(mode: "update" | "create" = "update") {
    if (!formPlan) return;
    setSaving(true);
    try {
      const isUpdate = mode === "update" && !!formId;
      const res = await fetch("/api/admin/forms/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isUpdate ? "update" : "save",
          formPlan,
          ...(isUpdate ? { formId } : {}),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const newFormId = json.data?.id?.toString() || json.data?.id;
        toast.success(
          isUpdate
            ? "Form başarıyla güncellendi!"
            : "Form başarıyla oluşturuldu!",
        );
        setFormPlan(null);
        setSaveChoice(null);

        const aiMsg: AiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: isUpdate
            ? "Form başarıyla güncellendi! Sayfa yenileniyor..."
            : "Form başarıyla oluşturuldu! Şimdi form düzenleme sayfasına yönlendiriliyorsunuz.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (isUpdate) {
          // Refresh the current page
          if (onFormCreated) onFormCreated(formId!);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          if (onFormCreated && newFormId) {
            onFormCreated(newFormId);
          }
          if (newFormId) {
            setTimeout(() => {
              router.push(`/admin/form-builder/${newFormId}`);
            }, 1500);
          }
        }
      } else {
        toast.error(json.error || "Form kaydedilemedi.");
      }
    } catch {
      toast.error("Bağlantı hatası.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/forms/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          message: text,
          formContext: buildFormContext(),
          formMode: formMode || "static",
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await res.json();

      if (json.success) {
        const { cleanContent, ready } = detectFormPlanReady(json.data.content);

        const aiMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: cleanContent,
          timestamp: new Date(),
          formPlanReady: ready,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch {
      const errMsg: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Bağlantı hatası. Lütfen tekrar deneyin.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
    setFormPlan(null);
  }

  function sendQuickMessage(text: string) {
    const userMsg: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    fetch("/api/admin/forms/ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId,
        message: text,
        formContext: buildFormContext(),
        formMode: formMode || "static",
        history: messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        const content = json.success
          ? json.data.content
          : "Bir hata oluştu. Lütfen tekrar deneyin.";
        const { cleanContent, ready } = detectFormPlanReady(content);

        const aiMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: cleanContent,
          timestamp: new Date(),
          formPlanReady: ready,
        };
        setMessages((prev) => [...prev, aiMsg]);
      })
      .catch(() => {
        const errMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Bağlantı hatası. Lütfen tekrar deneyin.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      })
      .finally(() => setLoading(false));
  }

  // Quick suggestion buttons
  const quickSuggestions = standalone
    ? [
        "Garson pozisyonu için başvuru formu oluştur",
        "Resepsiyon görevlisi başvuru formu hazırla",
        "Aşçıbaşı pozisyonu için detaylı form oluştur",
        "Genel otel personeli başvuru formu yap",
      ]
    : formMode === "dynamic"
      ? [
          "Bu pozisyon için hangi sorular sorulmalı?",
          "Dallanma kuralı öner",
          "Mevcut soruları değerlendir",
          "Formu otomatik oluştur",
        ]
      : [
          "Statik form için temel sorular öner",
          "Eksik kişisel bilgi alanları var mı?",
          "Soru sıralamasını değerlendir",
          "Formu otomatik oluştur",
        ];

  // Form plan preview component
  function FormPlanPreview() {
    if (!formPlan) return null;

    const groupedQuestions = formPlan.questions.reduce(
      (acc, q) => {
        const group = q.groupLabel || "Diğer";
        if (!acc[group]) acc[group] = [];
        acc[group].push(q);
        return acc;
      },
      {} as Record<string, AiFormQuestion[]>,
    );

    return (
      <div className="mx-3 mb-3 rounded-lg border border-mr-gold/30 bg-mr-gold/5 overflow-hidden">
        <button
          onClick={() => setPlanExpanded(!planExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-mr-navy hover:bg-mr-gold/10 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-mr-gold" />
            {formPlan.title} — {formPlan.questions.length} soru
          </span>
          {planExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {planExpanded && (
          <div className="px-3 pb-3 space-y-2 max-h-[250px] overflow-y-auto">
            <div className="flex gap-1.5 mb-2">
              <Badge variant="outline" className="text-[10px]">
                {formPlan.mode === "dynamic" ? "Dinamik" : "Statik"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {formPlan.questions.length} soru
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {Object.keys(groupedQuestions).length} grup
              </Badge>
            </div>

            {Object.entries(groupedQuestions).map(([group, qs]) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-mr-navy/70 uppercase tracking-wide mb-1">
                  {group}
                </p>
                {qs.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] text-mr-text-secondary py-0.5"
                  >
                    <span className="text-mr-gold shrink-0 mt-0.5">•</span>
                    <span>
                      {q.questionText}
                      <span className="text-mr-text-muted ml-1">
                        ({q.questionType}
                        {q.isRequired ? ", zorunlu" : ""})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex flex-col gap-2 pt-2 border-t border-mr-gold/20">
              {/* formId varsa: Güncelle mi, Yeni mi? seçeneği */}
              {formId && !standalone && !saveChoice ? (
                <>
                  <p className="text-[10px] text-mr-text-secondary text-center">
                    Mevcut formu güncellemek mi, yoksa yeni form oluşturmak mı
                    istiyorsunuz?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSaveChoice("update");
                        handleSaveFormPlan("update");
                      }}
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                    >
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Mevcut Formu Güncelle
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSaveChoice("create");
                        handleSaveFormPlan("create");
                      }}
                      disabled={saving}
                      className="flex-1 bg-mr-gold hover:bg-mr-gold-dark text-white text-xs h-8"
                    >
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <FileText className="w-3 h-3 mr-1" />
                      )}
                      Yeni Form Oluştur
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveFormPlan("create")}
                    disabled={saving}
                    className="flex-1 bg-mr-gold hover:bg-mr-gold-dark text-white text-xs h-8"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    {saving ? "Oluşturuluyor..." : "Onayla ve Oluştur"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormPlan(null);
                      setSaveChoice(null);
                    }}
                    className="text-xs h-8"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    İptal
                  </Button>
                </div>
              )}
              {/* İptal butonu — formId varken de göster */}
              {formId && !standalone && !saveChoice && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFormPlan(null);
                    setSaveChoice(null);
                  }}
                  className="text-xs h-7 w-full"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  İptal
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-mr-gold to-mr-gold-dark hover:from-mr-gold-dark hover:to-mr-gold text-white shadow-lg hover:shadow-xl transition-all"
        aria-label="AI Asistan'ı aç"
      >
        <Bot className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] flex flex-col shadow-2xl border-mr-gold/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-mr-navy to-mr-navy/90 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-mr-gold/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-mr-gold" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Form AI Asistan</h3>
            <p className="text-xs text-white/60">
              {standalone
                ? "Form oluşturma modu"
                : `${formMode === "dynamic" ? "Dinamik" : "Statik"} mod • ${questions.length} soru`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
              aria-label="Sohbeti temizle"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-mr-gold/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-mr-gold" />
            </div>
            <h4 className="text-sm font-semibold text-mr-navy mb-1">
              Form AI Asistan
            </h4>
            <p className="text-xs text-mr-text-secondary mb-4">
              {standalone
                ? "Hangi pozisyon için form oluşturmak istediğinizi söyleyin, sizin için otomatik olarak hazırlayayım. Sonra birlikte düzenleriz."
                : formMode === "dynamic"
                  ? "Dinamik form sorularınızı oluşturmanızda, dallanma kuralları belirlemenizde yardımcı olabilirim. İsterseniz formu otomatik olarak da oluşturabilirim."
                  : "Statik form sorularınızı düzenlemenizde yardımcı olabilirim. İsterseniz formu otomatik olarak da oluşturabilirim."}
            </p>
            <div className="space-y-2 w-full">
              {quickSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (suggestion === "Formu otomatik oluştur") {
                      handleGenerateForm();
                    } else {
                      sendQuickMessage(suggestion);
                    }
                  }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-mr-gold/20 bg-white hover:bg-mr-gold/5 hover:border-mr-gold/40 text-mr-text-secondary transition-colors"
                >
                  {suggestion === "Formu otomatik oluştur" ||
                  suggestion.includes("oluştur") ||
                  suggestion.includes("hazırla") ||
                  suggestion.includes("yap") ? (
                    <Wand2 className="w-3 h-3 inline mr-1.5 text-mr-gold" />
                  ) : (
                    <Sparkles className="w-3 h-3 inline mr-1.5 text-mr-gold" />
                  )}
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-mr-navy text-white rounded-br-md"
                        : "bg-white border border-border text-mr-text-primary rounded-bl-md shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </div>
                    <div
                      className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/50" : "text-mr-text-muted"}`}
                    >
                      {msg.timestamp.toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                {/* Show generate button when AI signals readiness */}
                {msg.formPlanReady && !formPlan && (
                  <div className="flex justify-start mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleGenerateForm()}
                      disabled={generating}
                      className="bg-mr-gold hover:bg-mr-gold-dark text-white text-xs"
                    >
                      {generating ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                      ) : (
                        <Wand2 className="w-3 h-3 mr-1.5" />
                      )}
                      {generating
                        ? "Form oluşturuluyor..."
                        : "Formu Otomatik Oluştur"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-mr-text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin text-mr-gold" />
                    Düşünüyorum...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Form Plan Preview */}
      <FormPlanPreview />

      {/* Input */}
      <div className="p-3 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              standalone
                ? "Hangi pozisyon için form oluşturayım?"
                : "Soru sor veya öneri iste..."
            }
            disabled={loading || generating}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || generating}
            size="sm"
            className="bg-mr-gold hover:bg-mr-gold-dark text-white px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {standalone
              ? "Oluşturucu"
              : formMode === "dynamic"
                ? "Dinamik"
                : "Statik"}
          </Badge>
          <span className="text-[10px] text-mr-text-muted">
            {standalone
              ? "Konuşarak form oluştur • AI destekli"
              : `Form bağlamını biliyor • ${questions.length} soru aktif`}
          </span>
        </div>
      </div>
    </Card>
  );
}
