"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";

// ─── Types ───

interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FieldDefinition {
  id: string;
  fieldName: string;
  normalizedName: string;
  fieldCategory: string;
  dataType: string;
}

interface EvalStats {
  total: number;
  evaluated: number;
  pending: number;
  failed: number;
}

interface EvalAction {
  type:
    | "PRE_FILTER"
    | "BATCH_EVALUATE"
    | "SINGLE_EVALUATE"
    | "CLEAR_FILTER"
    | "DEPT_FILTER"
    | "REFRESH_DATA"
    | "UPDATE_STATUS";
  payload?: Record<string, unknown>;
}

interface Department {
  id: string;
  name: string;
}

interface EvaluationAiAssistantProps {
  fieldDefs: FieldDefinition[];
  stats: EvalStats;
  filteredCount: number;
  preFilterActive: boolean;
  departments: Department[];
  onAction: (action: EvalAction) => void;
}

// ─── Parse AI action tags ───

function parseEvalActions(content: string): {
  cleanContent: string;
  actions: EvalAction[];
} {
  const actions: EvalAction[] = [];
  let clean = content;

  const actionRegex = /\[EVAL_ACTION:(\w+)\]\s*([\s\S]*?)\s*\[\/EVAL_ACTION\]/g;
  let match;

  while ((match = actionRegex.exec(content)) !== null) {
    const type = match[1] as EvalAction["type"];
    const rawPayload = match[2].trim();
    let payload: Record<string, unknown> | undefined;

    if (rawPayload) {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        // ignore parse errors
      }
    }

    actions.push({ type, payload });
    clean = clean.replace(match[0], "").trim();
  }

  return { cleanContent: clean, actions };
}

export function EvaluationAiAssistant({
  fieldDefs,
  stats,
  filteredCount,
  preFilterActive,
  departments,
  onAction,
}: EvaluationAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // Build context for AI
  function buildEvalContext(): string {
    const fieldList = fieldDefs
      .map(
        (f) =>
          `- ${f.fieldName} (${f.normalizedName}, tip: ${f.dataType}, kategori: ${f.fieldCategory})`,
      )
      .join("\n");

    const deptList = departments
      .map((d) => `- ${d.name} (ID: ${d.id})`)
      .join("\n");

    return `İstatistikler:
- Toplam başvuru: ${stats.total}
- Değerlendirilmiş: ${stats.evaluated}
- Değerlendirilmemiş: ${stats.pending}
- Başarısız: ${stats.failed}
${preFilterActive ? `- Ön filtre aktif: ${filteredCount} aday filtrelendi` : "- Ön filtre aktif değil"}

Departmanlar:
${deptList || "Departman bilgisi yok."}

Kullanılabilir Dinamik Alanlar (field_values tablosundan):
${fieldList || "Henüz dinamik alan tanımı yok."}

NOT: Ön filtreleme yaparken fieldName olarak normalizedName değerini kullan.
NOT: Departman filtreleme yaparken departmentName olarak yukarıdaki departman listesindeki TAM İSMİ kullan.`;
  }

  // Process AI actions
  function processActions(actions: EvalAction[]) {
    for (const action of actions) {
      onAction(action);
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
      const res = await fetch("/api/admin/evaluations/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          evalContext: buildEvalContext(),
          history: messages
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        const { cleanContent, actions } = parseEvalActions(json.data.content);
        const aiMsg: AiMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: cleanContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        if (actions.length > 0) {
          processActions(actions);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Bağlantı hatası. Lütfen tekrar deneyin.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function sendQuickMessage(text: string) {
    const userMsg: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    fetch("/api/admin/evaluations/ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        evalContext: buildEvalContext(),
        history: messages
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        const raw = json.success ? json.data.content : "Bir hata oluştu.";
        const { cleanContent, actions } = parseEvalActions(raw);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: cleanContent,
            timestamp: new Date(),
          },
        ]);
        if (actions.length > 0) processActions(actions);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Bağlantı hatası.",
            timestamp: new Date(),
          },
        ]);
      })
      .finally(() => setLoading(false));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const quickSuggestions = [
    "Garson pozisyonu için ön kriterler öner",
    "Tecrübesi 2 yıldan fazla olanları filtrele",
    "Değerlendirilmemiş adayları toplu değerlendir",
    "Hangi kriterlere göre filtreleme yapmalıyım?",
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-mr-gold to-mr-gold-dark hover:from-mr-gold-dark hover:to-mr-gold text-white shadow-lg hover:shadow-xl transition-all"
        aria-label="Değerlendirme AI Asistanı aç"
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
            <h3 className="text-sm font-semibold">Değerlendirme AI Asistan</h3>
            <p className="text-xs text-white/60">
              {stats.total} başvuru • {stats.pending} bekliyor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([])}
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
              Değerlendirme AI Asistan
            </h4>
            <p className="text-xs text-mr-text-secondary mb-4">
              Benimle konuşarak adayları filtreleyebilir, ön kriterler
              belirleyebilir ve toplu AI değerlendirme başlatabilirsiniz. Hangi
              pozisyon için değerlendirme yapmak istediğinizi söyleyin.
            </p>
            <div className="space-y-2 w-full">
              {quickSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuickMessage(suggestion)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-mr-gold/20 bg-white hover:bg-mr-gold/5 hover:border-mr-gold/40 text-mr-text-secondary transition-colors"
                >
                  <Sparkles className="w-3 h-3 inline mr-1.5 text-mr-gold" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
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
                    className={`text-[10px] mt-1 ${msg.role === "user" ? "text-white/50" : "text-mr-text-secondary"}`}
                  >
                    {msg.timestamp.toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
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

      {/* Input */}
      <div className="p-3 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Kriter belirle, filtrele veya değerlendir..."
            disabled={loading}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="sm"
            className="bg-mr-gold hover:bg-mr-gold-dark text-white px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {preFilterActive ? "Filtre Aktif" : "Tümü"}
          </Badge>
          <span className="text-[10px] text-mr-text-secondary">
            Konuşarak filtrele ve değerlendir • AI destekli
          </span>
        </div>
      </div>
    </Card>
  );
}
