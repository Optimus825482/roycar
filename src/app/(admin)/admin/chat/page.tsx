"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  isArchived?: boolean;
  _count: { messages: number };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ─── Table Detection ───
function containsMarkdownTable(text: string): boolean {
  // Detect GFM tables: header row + separator row with |---|
  return /\|.+\|[\r\n]+\|[\s:]*-+[\s:]*\|/.test(text);
}

// ─── Parse Markdown Table to 2D Array ───
function parseMarkdownTables(text: string): string[][][] {
  const tables: string[][][] = [];
  const lines = text.split("\n");
  let currentTable: string[][] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.startsWith("|") && line.endsWith("|");
    const isSeparator = /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)*\|$/.test(line);

    if (isTableRow && !isSeparator) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      currentTable.push(cells);
      inTable = true;
    } else if (isSeparator && inTable) {
      // skip separator row
    } else {
      if (inTable && currentTable.length > 0) {
        tables.push(currentTable);
        currentTable = [];
      }
      inTable = false;
    }
  }
  if (inTable && currentTable.length > 0) {
    tables.push(currentTable);
  }
  return tables;
}

// ─── Excel Export ───
async function exportToExcel(tables: string[][][], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  tables.forEach((table, idx) => {
    const ws = XLSX.utils.aoa_to_sheet(table);
    // Auto-width columns
    const colWidths = table[0]?.map((_, colIdx) => {
      const maxLen = Math.max(
        ...table.map((row) => (row[colIdx] || "").length),
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, `Tablo ${idx + 1}`);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF Export ───
async function exportToPdf(tables: string[][][], filename: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74); // mr-navy
  doc.text("Merit Royal Hotels - AI Rapor", 14, 15);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(new Date().toLocaleString("tr-TR"), 14, 21);

  let startY = 28;

  tables.forEach((table, idx) => {
    if (idx > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prev = (doc as any).lastAutoTable;
      startY = prev?.finalY ? prev.finalY + 12 : startY + 10;
    }
    const head = [table[0] || []];
    const body = table.slice(1);

    autoTable(doc, {
      head,
      body,
      startY,
      theme: "grid",
      headStyles: {
        fillColor: [197, 165, 90], // mr-gold
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [248, 247, 243],
      },
      styles: {
        cellPadding: 3,
        lineColor: [220, 220, 220],
        lineWidth: 0.3,
      },
      margin: { left: 14, right: 14 },
    });
  });

  doc.save(`${filename}.pdf`);
}

// ─── Export Buttons Component ───
function TableExportButtons({ content }: { content: string }) {
  const tables = parseMarkdownTables(content);
  if (tables.length === 0) return null;

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `merit-ai-rapor-${ts}`;

  return (
    <div className="flex gap-2 mb-2">
      <button
        onClick={async () => {
          try {
            await exportToExcel(tables, filename);
          } catch {
            toast.error("Excel dışa aktarma başarısız", {
              description: "Dosya indirilemedi. Lütfen tekrar deneyin.",
            });
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
        title="Excel olarak indir"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Excel
      </button>
      <button
        onClick={async () => {
          try {
            await exportToPdf(tables, filename);
          } catch {
            toast.error("PDF dışa aktarma başarısız", {
              description: "Dosya indirilemedi. Lütfen tekrar deneyin.",
            });
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
        title="PDF olarak indir"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <polyline points="9 15 12 18 15 15" />
        </svg>
        PDF
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { data: session } = useSession();
  const adminUsername =
    (session?.user as { username?: string })?.username || "";
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [ttsSpeechRate, setTtsSpeechRate] = useState(1.0);
  const [activeModel, setActiveModel] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoCreatedRef = useRef(false);
  const pendingVoiceResponseRef = useRef(false);
  const sendingRef = useRef(false);
  const voiceModeRef = useRef(false);
  const speakRef = useRef<(text: string) => void>(() => {});

  // ─── Voice Chat Hook ───
  const {
    voiceState,
    isVoiceMode,
    transcript: voiceTranscript,
    startVoiceMode,
    stopVoiceMode,
    speak,
    stopSpeaking,
    isBrowserSupported: isVoiceSupported,
    micPermissionDenied,
    clearMicError,
  } = useVoiceChat({
    onTranscript: (text) => {
      if (text.trim() && activeSessionId && !sendingRef.current) {
        pendingVoiceResponseRef.current = true;
        sendVoiceMessage(text);
      }
    },
    silenceThresholdMs: 2000,
    minSpeechMs: 600,
    speechRate: ttsSpeechRate,
  });

  // ─── Mic Permission Feedback ───
  useEffect(() => {
    if (!micPermissionDenied) return;
    toast.error("Mikrofon erişimi reddedildi", {
      description:
        "Tarayıcı adres çubuğundaki kilit simgesinden mikrofon iznini açın ve sayfayı yenileyin.",
      duration: 7000,
    });
    clearMicError();
  }, [micPermissionDenied, clearMicError]);

  // Fetch TTS speech rate from settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const json = await res.json();
        if (json.success) {
          const rate = parseFloat(
            json.data?.settings?.tts_speech_rate || "1.0",
          );
          if (!isNaN(rate) && rate >= 0.5 && rate <= 2.0) {
            setTtsSpeechRate(rate);
          }
          if (json.data?.activeProvider?.label) {
            setActiveModel(json.data.activeProvider.label);
          }
        }
      } catch {
        /* use default */
      }
    })();
  }, []);

  // Sync refs to avoid stale closures in async SSE handlers
  useEffect(() => {
    voiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  const fetchSessions = useCallback(async (archived = false) => {
    try {
      const url = archived
        ? "/api/admin/chat/sessions?archived=true"
        : "/api/admin/chat/sessions";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } catch {
      toast.error("Sohbet listesi yüklenemedi", {
        description: "Lütfen sayfayı yenileyin.",
      });
    }
    setLoadingSessions(false);
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/chat/sessions/${sessionId}/messages`);
      const json = await res.json();
      if (json.success) setMessages(json.data);
    } catch {
      toast.error("Mesajlar yüklenemedi", {
        description: "Lütfen tekrar deneyin.",
      });
    }
  }, []);

  const createSession = useCallback(async () => {
    try {
      // Clean up empty sessions (0 messages) before creating new one
      const cleanupRes = await fetch("/api/admin/chat/sessions");
      const cleanupJson = await cleanupRes.json();
      if (cleanupJson.success) {
        const emptySessions = (cleanupJson.data as ChatSession[]).filter(
          (s) => (s._count?.messages ?? 0) === 0,
        );
        for (const empty of emptySessions) {
          await fetch(`/api/admin/chat/sessions/${empty.id}`, {
            method: "DELETE",
          }).catch(() => {});
        }
        // Remove them from local state too
        if (emptySessions.length > 0) {
          const emptyIds = new Set(emptySessions.map((s) => s.id));
          setSessions((prev) => prev.filter((s) => !emptyIds.has(s.id)));
        }
      }

      const res = await fetch("/api/admin/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => [json.data, ...prev]);
        setActiveSessionId(json.data.id);
        setMessages([]);
        return json.data.id as string;
      }
    } catch {
      toast.error("Yeni sohbet oluşturulamadı", {
        description: "Lütfen tekrar deneyin.",
      });
    }
    return null;
  }, []);

  // Auto-create or reuse session on page load
  useEffect(() => {
    if (autoCreatedRef.current) return;
    autoCreatedRef.current = true;

    (async () => {
      try {
        // Fetch active sessions first
        const res = await fetch("/api/admin/chat/sessions");
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          const sessionList = json.data as ChatSession[];
          setSessions(sessionList);

          // Find the most recent session with 0 messages — reuse it
          const emptySession = sessionList.find(
            (s) => (s._count?.messages ?? 0) === 0,
          );
          if (emptySession) {
            setActiveSessionId(emptySession.id);
            setMessages([]);
            setLoadingSessions(false);
            return;
          }
        }
      } catch {
        // fallback to creating new
      }
      // No empty session found — create new one
      await createSession();
      setLoadingSessions(false);
    })();
  }, [createSession]);

  useEffect(() => {
    fetchSessions(showArchived);
  }, [fetchSessions, showArchived]);

  useEffect(() => {
    if (activeSessionId) fetchMessages(activeSessionId);
  }, [activeSessionId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const deleteSession = async (id: string) => {
    try {
      await fetch(`/api/admin/chat/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        const newId = await createSession();
        if (!newId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
      setConfirmDelete(null);
    } catch {
      toast.error("Sohbet silinemedi", {
        description: "Lütfen tekrar deneyin.",
      });
    }
  };

  const toggleArchive = async (id: string, archive: boolean) => {
    try {
      await fetch(`/api/admin/chat/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        const newId = await createSession();
        if (!newId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch {
      toast.error("Arşivleme başarısız", {
        description: "Lütfen tekrar deneyin.",
      });
    }
  };

  // ─── Bulk Actions ───

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const bulkAction = async (action: "delete" | "archive" | "unarchive") => {
    if (selectedIds.size === 0) return;
    if (
      action === "delete" &&
      !confirm(`${selectedIds.size} sohbeti silmek istediğinize emin misiniz?`)
    )
      return;
    setBulkRunning(true);
    try {
      const res = await fetch("/api/admin/chat/sessions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
        if (selectedIds.has(activeSessionId || "")) {
          const newId = await createSession();
          if (!newId) {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
        exitBulkMode();
      }
    } catch {
      toast.error("İşlem başarısız", {
        description: "Toplu işlem gerçekleştirilemedi. Lütfen tekrar deneyin.",
      });
    }
    setBulkRunning(false);
  };

  // ─── Shared SSE streaming helper ───
  // onResponse is called once with the final assistant message content.
  const streamChatSSE = async (
    text: string,
    onResponse?: (content: string) => void,
  ) => {
    abortRef.current = new AbortController();
    const res = await fetch(
      `/api/admin/chat/sessions/${activeSessionId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-username": adminUsername,
        },
        body: JSON.stringify({ message: text, stream: true }),
        signal: abortRef.current.signal,
      },
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream") && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let doneReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.replace && data.content) {
              accumulated = data.content;
              setStreamingContent(accumulated);
            } else if (data.token) {
              accumulated += data.token;
              setStreamingContent(accumulated);
            }
            if (data.done && data.message) {
              doneReceived = true;
              setStreamingContent("");
              setMessages((prev) => [...prev, data.message]);
              onResponse?.(data.message.content);
            }
            if (data.error) {
              doneReceived = true;
              setStreamingContent("");
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: data.error,
                  createdAt: new Date().toISOString(),
                },
              ]);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }

      if (!doneReceived && accumulated.trim()) {
        setStreamingContent("");
        const fallbackMsg: ChatMessage = {
          id: `stream-${Date.now()}`,
          role: "assistant",
          content: accumulated,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        onResponse?.(accumulated);
      }
    } else {
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        onResponse?.(json.data.content);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSessionId || sending) return;
    const userMsg = input.trim();
    setInput("");
    sendingRef.current = true;
    setSending(true);
    setStreamingContent("");

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: userMsg,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await streamChatSSE(userMsg);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamingContent("");
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Bir hata oluştu. Lütfen tekrar deneyin.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    }
    sendingRef.current = false;
    setSending(false);
    abortRef.current = null;
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `stopped-${Date.now()}`,
          role: "assistant",
          content: streamingContent,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreamingContent("");
    }
    sendingRef.current = false;
    setSending(false);
    // Also stop speaking if in voice mode
    if (isVoiceMode) stopSpeaking();
  };

  // ─── Send message from voice input ───
  const sendVoiceMessage = async (text: string) => {
    if (!text.trim() || !activeSessionId || sendingRef.current) return;
    setInput("");
    sendingRef.current = true;
    setSending(true);
    setStreamingContent("");

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await streamChatSSE(text, (content) => {
        // Speak the response in voice mode
        if (pendingVoiceResponseRef.current) {
          speakRef.current(content);
        }
        pendingVoiceResponseRef.current = false;
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamingContent("");
        pendingVoiceResponseRef.current = false;
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Bir hata oluştu. Lütfen tekrar deneyin.",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    }
    sendingRef.current = false;
    setSending(false);
    abortRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Shared prose classes for AI messages
  const aiMessageClasses =
    "bg-mr-bg-secondary text-mr-text-primary prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1 prose-headings:text-mr-navy prose-strong:text-mr-navy [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-xs [&_thead]:bg-mr-navy [&_thead_th]:text-white [&_thead_th]:px-3 [&_thead_th]:py-2 [&_thead_th]:text-left [&_thead_th]:font-semibold [&_thead_th]:border [&_thead_th]:border-mr-navy/30 [&_tbody_td]:px-3 [&_tbody_td]:py-1.5 [&_tbody_td]:border [&_tbody_td]:border-gray-200 [&_tbody_tr:nth-child(even)]:bg-mr-gold/5 [&_tbody_tr:hover]:bg-mr-gold/10 [&_tbody_tr]:transition-colors";

  return (
    <div
      className="flex h-[calc(100vh-7rem)] gap-4"
      role="main"
      aria-label="AI Sohbet"
    >
      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-mr-text-primary mb-4">
              Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(null)}
              >
                İptal
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => deleteSession(confirmDelete)}
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area — LEFT (main) */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b py-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Merit AI Asistan</CardTitle>
            {activeModel && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-mr-bg-secondary text-mr-text-muted font-normal">
                {activeModel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Voice state indicator */}
            {isVoiceMode && (
              <div className="flex items-center gap-1.5 text-xs">
                {voiceState === "listening" && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    Dinliyor...
                  </span>
                )}
                {voiceState === "processing" && (
                  <span className="text-amber-600 animate-pulse">
                    İşleniyor...
                  </span>
                )}
                {voiceState === "speaking" && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="animate-pulse"
                    >
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                    </svg>
                    Konuşuyor...
                  </span>
                )}
              </div>
            )}
            {/* Voice mode toggle */}
            {isVoiceSupported && (
              <button
                onClick={() => {
                  if (isVoiceMode) {
                    stopVoiceMode();
                  } else {
                    startVoiceMode();
                  }
                }}
                className={`p-2 rounded-lg transition-all ${
                  isVoiceMode
                    ? "bg-red-50 text-red-600 hover:bg-red-100 ring-2 ring-red-200"
                    : "bg-mr-bg-secondary text-mr-text-secondary hover:bg-mr-gold/10 hover:text-mr-gold"
                }`}
                title={
                  isVoiceMode ? "Sesli sohbeti kapat" : "Sesli sohbet başlat"
                }
                aria-label={
                  isVoiceMode ? "Sesli sohbeti kapat" : "Sesli sohbet başlat"
                }
              >
                {isVoiceMode ? (
                  // Mic OFF icon
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  // Mic ON icon
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-label="Mesajlar"
          aria-live="polite"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-mr-navy text-white whitespace-pre-wrap"
                    : aiMessageClasses
                }`}
                aria-label={m.role === "user" ? "Sizin mesajınız" : "AI yanıtı"}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <>
                    {containsMarkdownTable(m.content) && (
                      <TableExportButtons content={m.content} />
                    )}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </>
                )}
              </div>
            </div>
          ))}
          {streamingContent && (
            <div className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${aiMessageClasses}`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {streamingContent}
                </ReactMarkdown>
                <span
                  className="inline-block w-1.5 h-4 bg-mr-gold ml-0.5 animate-pulse"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}
          {sending && !streamingContent && (
            <div className="flex justify-start">
              <div
                className="bg-mr-bg-secondary rounded-lg px-4 py-2 text-sm text-mr-text-muted"
                aria-live="polite"
              >
                Düşünüyor...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-3 flex flex-col gap-2">
          {/* Voice transcript preview */}
          {isVoiceMode && voiceTranscript && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 animate-pulse">
              🎤 {voiceTranscript}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isVoiceMode
                  ? "Sesli sohbet aktif — konuşun..."
                  : "Mesajınızı yazın..."
              }
              className="resize-none min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={sending || (isVoiceMode && voiceState === "listening")}
              aria-label="Mesaj giriş alanı"
            />
            {/* Speaking stop button */}
            {isVoiceMode && voiceState === "speaking" ? (
              <Button
                onClick={stopSpeaking}
                variant="outline"
                className="shrink-0 text-blue-600 border-blue-300 hover:bg-blue-50"
                aria-label="Konuşmayı durdur"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </Button>
            ) : sending ? (
              <Button
                onClick={stopStreaming}
                variant="outline"
                className="shrink-0 text-mr-error border-mr-error hover:bg-mr-error/10"
                aria-label="Yanıtı durdur"
              >
                Durdur
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="bg-mr-gold hover:bg-mr-gold-dark text-white shrink-0"
                aria-label="Mesaj gönder"
              >
                Gönder
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Sessions Sidebar — RIGHT */}
      <nav
        className="w-64 shrink-0 hidden lg:flex flex-col"
        aria-label="Sohbet oturumları"
      >
        <div className="flex gap-2 mb-3">
          <Button
            onClick={createSession}
            className="flex-1 bg-mr-navy hover:bg-mr-navy-light"
            aria-label="Yeni sohbet başlat"
          >
            + Yeni Sohbet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
            className={`shrink-0 text-xs ${bulkMode ? "bg-mr-gold/20 border-mr-gold text-mr-navy" : ""}`}
            aria-label={bulkMode ? "Seçimi iptal et" : "Toplu seçim modu"}
          >
            {bulkMode ? "✕" : "☑"}
          </Button>
        </div>

        {/* Bulk action bar */}
        {bulkMode && (
          <div className="mb-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-mr-text-muted px-1">
              <button
                onClick={toggleSelectAll}
                className="hover:text-mr-navy transition-colors"
              >
                {selectedIds.size === sessions.length
                  ? "Seçimi Kaldır"
                  : "Tümünü Seç"}
              </button>
              <span>{selectedIds.size} seçili</span>
            </div>
            <div className="flex gap-1">
              {showArchived ? (
                <button
                  onClick={() => bulkAction("unarchive")}
                  disabled={selectedIds.size === 0 || bulkRunning}
                  className="flex-1 py-1.5 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                >
                  {bulkRunning ? "..." : "Arşivden Çıkar"}
                </button>
              ) : (
                <button
                  onClick={() => bulkAction("archive")}
                  disabled={selectedIds.size === 0 || bulkRunning}
                  className="flex-1 py-1.5 text-xs rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                >
                  {bulkRunning ? "..." : "Arşivle"}
                </button>
              )}
              <button
                onClick={() => bulkAction("delete")}
                disabled={selectedIds.size === 0 || bulkRunning}
                className="flex-1 py-1.5 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40 transition-colors"
              >
                {bulkRunning ? "..." : "Sil"}
              </button>
            </div>
          </div>
        )}

        {/* Archive toggle */}
        <div className="flex mb-2 rounded-md overflow-hidden border border-border text-xs">
          <button
            onClick={() => setShowArchived(false)}
            className={`flex-1 py-1.5 transition-colors ${!showArchived ? "bg-mr-navy text-white" : "bg-white text-mr-text-secondary hover:bg-mr-bg-secondary"}`}
          >
            Aktif
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`flex-1 py-1.5 transition-colors ${showArchived ? "bg-mr-navy text-white" : "bg-white text-mr-text-secondary hover:bg-mr-bg-secondary"}`}
          >
            Arşiv
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto space-y-1"
          role="list"
          aria-label="Sohbet listesi"
        >
          {loadingSessions ? (
            <p className="text-sm text-mr-text-muted p-2" aria-live="polite">
              Yükleniyor...
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-mr-text-muted p-2">
              {showArchived ? "Arşivde sohbet yok." : "Henüz sohbet yok."}
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                role="listitem"
                className={`group relative rounded-md transition-colors ${
                  selectedIds.has(s.id)
                    ? "bg-mr-gold/15 ring-1 ring-mr-gold/40"
                    : activeSessionId === s.id
                      ? "bg-mr-gold/20"
                      : "hover:bg-mr-bg-secondary"
                }`}
              >
                <div className="flex items-center">
                  {bulkMode && (
                    <label
                      className="flex items-center pl-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded border-gray-300 text-mr-gold focus:ring-mr-gold/50 w-3.5 h-3.5"
                      />
                    </label>
                  )}
                  <button
                    onClick={() => {
                      if (bulkMode) {
                        toggleSelect(s.id);
                      } else {
                        setActiveSessionId(s.id);
                        setMessages([]);
                      }
                    }}
                    aria-current={activeSessionId === s.id ? "true" : undefined}
                    className="flex-1 text-left px-3 py-2 text-sm min-w-0"
                  >
                    <div className={`truncate ${bulkMode ? "pr-2" : "pr-12"}`}>
                      {s.title}
                    </div>
                    <div className="text-xs text-mr-text-muted">
                      {s._count?.messages ?? 0} mesaj
                    </div>
                  </button>
                </div>

                {/* Action buttons — hide in bulk mode */}
                {!bulkMode && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                    {showArchived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(s.id, false);
                        }}
                        className="p-1 rounded hover:bg-mr-gold/20 text-mr-text-muted hover:text-mr-navy"
                        title="Arşivden çıkar"
                        aria-label="Arşivden çıkar"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 14l-4-4m0 0l4-4m-4 4h11a4 4 0 010 8h-1" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(s.id, true);
                        }}
                        className="p-1 rounded hover:bg-mr-gold/20 text-mr-text-muted hover:text-mr-navy"
                        title="Arşivle"
                        aria-label="Arşivle"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                          <path d="M10 12h4" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(s.id);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-mr-text-muted hover:text-red-500"
                      title="Sil"
                      aria-label="Sohbeti sil"
                    >
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </nav>
    </div>
  );
}
