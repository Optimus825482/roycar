"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProviderInfo {
  key: string;
  label: string;
  configured: boolean;
}

interface SettingsData {
  settings: Record<string, string>;
  providers: ProviderInfo[];
  prompts: {
    chat_system_prompt: string;
    evaluation_system_prompt: string;
  };
  defaultPrompts: Record<string, string>;
}

interface UserPermissions {
  form_builder: boolean;
  ai_chat: boolean;
  evaluations: boolean;
  screening: boolean;
  data_import: boolean;
  settings: boolean;
  user_management: boolean;
}

interface AdminUserData {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  role: string;
  permissions: UserPermissions;
  isActive: boolean;
  createdAt: string;
}

const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  form_builder: "Form Oluşturma",
  ai_chat: "AI Sohbet",
  evaluations: "Başvuru Değerlendirme",
  screening: "Ön Eleme",
  data_import: "Veri Aktarımı",
  settings: "Ayarlar",
  user_management: "Kullanıcı Yönetimi",
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  form_builder: true,
  ai_chat: true,
  evaluations: true,
  screening: true,
  data_import: true,
  settings: false,
  user_management: false,
};

const TABS = [
  { key: "ai", label: "Yapay Zeka", icon: "🤖" },
  { key: "voice", label: "Sesli Sohbet", icon: "🎙️" },
  { key: "prompts", label: "Sistem Prompt'ları", icon: "💬" },
  { key: "users", label: "Kullanıcı Yönetimi", icon: "👥" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ai");
  const [data, setData] = useState<SettingsData | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [evalPrompt, setEvalPrompt] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // TTS settings state
  const [ttsSpeechRate, setTtsSpeechRate] = useState(1.0);
  const [savingTts, setSavingTts] = useState(false);

  // User management state
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [newUser, setNewUser] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "hr_manager",
    permissions: { ...DEFAULT_PERMISSIONS },
  });
  const [editPerms, setEditPerms] = useState<UserPermissions>({
    ...DEFAULT_PERMISSIONS,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success) {
        const d = json.data as SettingsData;
        setData(d);
        setSelectedProvider(d.settings.ai_provider || "deepseek");
        setChatPrompt(d.prompts.chat_system_prompt);
        setEvalPrompt(d.prompts.evaluation_system_prompt);
        // Load TTS speech rate
        const rate = parseFloat(d.settings.tts_speech_rate || "1.0");
        setTtsSpeechRate(
          isNaN(rate) ? 1.0 : Math.max(0.5, Math.min(2.0, rate)),
        );
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, [fetchSettings, fetchUsers]);

  // ─── Handlers ───

  const handleSaveProvider = async () => {
    setSaving("provider");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_provider: selectedProvider }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("AI sağlayıcı güncellendi");
        fetchSettings();
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(null);
  };

  const handleSaveTtsRate = async () => {
    setSavingTts(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tts_speech_rate: ttsSpeechRate.toString() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Konuşma hızı kaydedildi");
      }
    } catch (err) {
      console.error(err);
    }
    setSavingTts(false);
  };

  const handleSavePrompt = async (
    key: "chat_system_prompt" | "evaluation_system_prompt",
  ) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [key]: key === "chat_system_prompt" ? chatPrompt : evalPrompt,
        }),
      });
      const json = await res.json();
      if (json.success)
        showToast(
          key === "chat_system_prompt"
            ? "Chat prompt kaydedildi"
            : "Değerlendirme prompt kaydedildi",
        );
    } catch (err) {
      console.error(err);
    }
    setSaving(null);
  };

  const handleResetPrompt = (
    key: "chat_system_prompt" | "evaluation_system_prompt",
  ) => {
    if (!data?.defaultPrompts[key]) return;
    if (key === "chat_system_prompt") setChatPrompt(data.defaultPrompts[key]);
    else setEvalPrompt(data.defaultPrompts[key]);
  };

  const handleCreateUser = async () => {
    if (
      !newUser.fullName.trim() ||
      !newUser.username.trim() ||
      !newUser.password.trim()
    ) {
      showToast("Kullanıcı adı, ad soyad ve parola zorunludur");
      return;
    }
    setSaving("create-user");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Kullanıcı oluşturuldu");
        setShowAddUser(false);
        setNewUser({
          fullName: "",
          username: "",
          email: "",
          password: "",
          role: "hr_manager",
          permissions: { ...DEFAULT_PERMISSIONS },
        });
        fetchUsers();
      } else showToast(json.error || "Hata oluştu");
    } catch {
      showToast("Bağlantı hatası");
    }
    setSaving(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSaving("update-user");
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPerms }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Yetkiler güncellendi");
        setEditingUser(null);
        fetchUsers();
      } else showToast(json.error || "Hata oluştu");
    } catch {
      showToast("Bağlantı hatası");
    }
    setSaving(null);
  };

  const handleToggleActive = async (user: AdminUserData) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          user.isActive
            ? "Kullanıcı devre dışı bırakıldı"
            : "Kullanıcı aktifleştirildi",
        );
        fetchUsers();
      }
    } catch {
      showToast("Bağlantı hatası");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast("Kullanıcı silindi");
        setDeleteConfirm(null);
        fetchUsers();
      } else showToast(json.error || "Hata oluştu");
    } catch {
      showToast("Bağlantı hatası");
    }
  };

  if (loading || !data) {
    return (
      <div className="text-center py-12 text-mr-text-muted">Yükleniyor...</div>
    );
  }

  const currentProvider = data.settings.ai_provider || "deepseek";

  return (
    <div className="max-w-4xl" role="main" aria-label="Sistem ayarları">
      <h1 className="text-2xl font-heading text-mr-navy mb-6">Ayarlar</h1>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 bg-mr-navy text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2"
          role="status"
        >
          ✓ {toast}
        </div>
      )}

      {/* ─── Tab Navigation ─── */}
      <div
        className="border-b border-gray-200 mb-6"
        role="tablist"
        aria-label="Ayar kategorileri"
      >
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-mr-gold text-mr-navy"
                  : "border-transparent text-mr-text-muted hover:text-mr-navy hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab: Yapay Zeka ─── */}
      {activeTab === "ai" && (
        <div id="panel-ai" role="tabpanel" className="space-y-6">
          {/* AI Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                🤖 Yapay Zeka Sağlayıcı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-mr-text-muted">
                AI Chat ve Başvuru Değerlendirme için kullanılacak yapay zeka
                sağlayıcısını seçin.
              </p>
              <div
                className="space-y-3"
                role="radiogroup"
                aria-label="AI sağlayıcı seçimi"
              >
                {data.providers.map((p) => {
                  const isSelected = selectedProvider === p.key;
                  const isActive = currentProvider === p.key;
                  return (
                    <div
                      key={p.key}
                      onClick={() => p.configured && setSelectedProvider(p.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          p.configured && setSelectedProvider(p.key);
                        }
                      }}
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={!p.configured}
                      tabIndex={p.configured ? 0 : -1}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-mr-gold bg-mr-gold/5 shadow-sm"
                          : "border-gray-200 hover:border-mr-gold/40"
                      } ${!p.configured ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-mr-gold bg-mr-gold" : "border-gray-300"}`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-mr-navy">
                            {p.label}
                          </div>
                          <div className="text-xs text-mr-text-muted mt-0.5">
                            {p.key === "deepseek" &&
                              "DeepSeek API — Genel amaçlı, JSON mode destekli"}
                            {p.key === "nvidia_minimax" &&
                              "NVIDIA Integrate API — MiniMax M2.1, yüksek performanslı"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isActive && (
                          <Badge className="bg-mr-gold/20 text-mr-gold border-mr-gold/30 text-xs">
                            Aktif
                          </Badge>
                        )}
                        {p.configured ? (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            API Key ✓
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            API Key Eksik
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSaveProvider}
                  disabled={
                    saving === "provider" ||
                    selectedProvider === currentProvider
                  }
                  className="bg-mr-navy hover:bg-mr-navy-light text-white"
                >
                  {saving === "provider"
                    ? "Kaydediliyor..."
                    : "Sağlayıcıyı Kaydet"}
                </Button>
                {selectedProvider !== currentProvider && (
                  <span className="text-xs text-amber-600">
                    Değişiklik kaydedilmedi
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Key Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                🔑 API Anahtarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-mr-text-muted">
                API anahtarları güvenlik nedeniyle{" "}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                  .env.local
                </code>{" "}
                dosyasından okunur.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-1 text-gray-700">
                <div className="text-gray-400"># DeepSeek</div>
                <div>DEEPSEEK_API_KEY=&quot;sk-...&quot;</div>
                <div className="text-gray-400 mt-2"># NVIDIA DeepSeek V3.2</div>
                <div>NVIDIA_API_KEY=&quot;nvapi-...&quot;</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Sesli Sohbet ─── */}
      {activeTab === "voice" && (
        <div id="panel-voice" role="tabpanel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                🎙️ Konuşma Hızı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-mr-text-muted">
                AI sesli yanıtlarının konuşma hızını ayarlayın. Değişiklik tüm
                kullanıcılar için geçerli olur.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-mr-text-muted w-12">Yavaş</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={ttsSpeechRate}
                    onChange={(e) =>
                      setTtsSpeechRate(parseFloat(e.target.value))
                    }
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-mr-gold"
                    aria-label="Konuşma hızı"
                  />
                  <span className="text-xs text-mr-text-muted w-12 text-right">
                    Hızlı
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-mr-navy">
                    Hız: {ttsSpeechRate.toFixed(2)}x
                  </div>
                  <div className="flex items-center gap-2">
                    {[0.75, 1.0, 1.25, 1.5].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setTtsSpeechRate(preset)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          Math.abs(ttsSpeechRate - preset) < 0.01
                            ? "bg-mr-gold/20 border-mr-gold text-mr-navy font-medium"
                            : "border-gray-200 text-mr-text-muted hover:border-mr-gold/40"
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSaveTtsRate}
                disabled={savingTts}
                className="bg-mr-navy hover:bg-mr-navy-light text-white"
              >
                {savingTts ? "Kaydediliyor..." : "Hızı Kaydet"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                🗣️ Doğal Konuşma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-mr-text-muted">
                Sesli sohbet, daha doğal bir konuşma deneyimi için otomatik
                olarak şu iyileştirmeleri uygular:
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-mr-gold mt-0.5">✓</span>
                  <span className="text-mr-text-primary">
                    Cümle sonlarında doğal duraklamalar (nokta, virgül, soru
                    işareti)
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-mr-gold mt-0.5">✓</span>
                  <span className="text-mr-text-primary">
                    Soru cümlelerinde ton yükselmesi, ifade cümlelerinde ton
                    düşmesi
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-mr-gold mt-0.5">✓</span>
                  <span className="text-mr-text-primary">
                    Uzun cümlelerde hafif yavaşlama, kısa cümlelerde hafif
                    hızlanma
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-mr-gold mt-0.5">✓</span>
                  <span className="text-mr-text-primary">
                    Türkçe yerel ses tercihi (Microsoft Emel veya en iyi yerel
                    ses)
                  </span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                💡 Sesli sohbet, tarayıcınızın Web Speech API desteğine
                bağlıdır. Microsoft Edge en iyi Türkçe ses deneyimini sunar.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Sistem Prompt'ları ─── */}
      {activeTab === "prompts" && (
        <div id="panel-prompts" role="tabpanel" className="space-y-6">
          {/* Chat System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                💬 AI Chat — Sistem Prompt&apos;u
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-mr-text-muted">
                AI Asistan sohbetlerinde kullanılan persona ve talimatlar.
                Değiştirdiğinizde yeni sohbetlerde geçerli olur.
              </p>
              <textarea
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm font-mono leading-relaxed text-mr-navy focus:border-mr-gold focus:ring-2 focus:ring-mr-gold/20 focus:outline-none resize-y"
                aria-label="Chat sistem prompt'u"
                placeholder="Chat için sistem prompt'unu buraya yazın..."
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleSavePrompt("chat_system_prompt")}
                  disabled={saving === "chat_system_prompt"}
                  className="bg-mr-navy hover:bg-mr-navy-light text-white"
                >
                  {saving === "chat_system_prompt"
                    ? "Kaydediliyor..."
                    : "Chat Prompt Kaydet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResetPrompt("chat_system_prompt")}
                  className="text-mr-text-muted hover:text-mr-navy"
                >
                  Varsayılana Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center gap-2">
                📋 Başvuru Değerlendirme — Sistem Prompt&apos;u
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-mr-text-muted">
                Başvuru değerlendirmelerinde kullanılan İK uzmanı persona ve
                puanlama kriterleri. JSON format talimatını korumaya dikkat
                edin.
              </p>
              <textarea
                value={evalPrompt}
                onChange={(e) => setEvalPrompt(e.target.value)}
                rows={18}
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm font-mono leading-relaxed text-mr-navy focus:border-mr-gold focus:ring-2 focus:ring-mr-gold/20 focus:outline-none resize-y"
                aria-label="Değerlendirme sistem prompt'u"
                placeholder="Değerlendirme için sistem prompt'unu buraya yazın..."
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleSavePrompt("evaluation_system_prompt")}
                  disabled={saving === "evaluation_system_prompt"}
                  className="bg-mr-navy hover:bg-mr-navy-light text-white"
                >
                  {saving === "evaluation_system_prompt"
                    ? "Kaydediliyor..."
                    : "Değerlendirme Prompt Kaydet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleResetPrompt("evaluation_system_prompt")}
                  className="text-mr-text-muted hover:text-mr-navy"
                >
                  Varsayılana Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Tab: Kullanıcı Yönetimi ─── */}
      {activeTab === "users" && (
        <div id="panel-users" role="tabpanel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-mr-navy flex items-center justify-between">
                <span className="flex items-center gap-2">
                  👥 Kullanıcı Yönetimi
                </span>
                <Button
                  onClick={() => setShowAddUser(!showAddUser)}
                  size="sm"
                  className="bg-mr-gold hover:bg-mr-gold/90 text-mr-navy"
                >
                  {showAddUser ? "İptal" : "+ Yeni Kullanıcı"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add User Form */}
              {showAddUser && (
                <div className="border border-mr-gold/30 rounded-lg p-4 bg-mr-gold/5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-mr-text-muted block mb-1">
                        Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) =>
                          setNewUser({ ...newUser, username: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-mr-gold focus:ring-1 focus:ring-mr-gold/20 focus:outline-none"
                        placeholder="kullanici.adi"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-mr-text-muted block mb-1">
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        value={newUser.fullName}
                        onChange={(e) =>
                          setNewUser({ ...newUser, fullName: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-mr-gold focus:ring-1 focus:ring-mr-gold/20 focus:outline-none"
                        placeholder="Ad Soyad"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-mr-text-muted block mb-1">
                        E-posta (opsiyonel)
                      </label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-mr-gold focus:ring-1 focus:ring-mr-gold/20 focus:outline-none"
                        placeholder="ornek@meritroyal.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-mr-text-muted block mb-1">
                        Parola
                      </label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-mr-gold focus:ring-1 focus:ring-mr-gold/20 focus:outline-none"
                        placeholder="Min. 6 karakter"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-mr-text-muted block mb-1">
                        Rol
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({ ...newUser, role: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-mr-gold focus:ring-1 focus:ring-mr-gold/20 focus:outline-none"
                      >
                        <option value="hr_manager">İK Yöneticisi</option>
                        <option value="hr_specialist">İK Uzmanı</option>
                        <option value="admin">Yönetici</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-mr-text-muted block mb-2">
                      Yetkiler
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.keys(
                          PERMISSION_LABELS,
                        ) as (keyof UserPermissions)[]
                      ).map((perm) => (
                        <label
                          key={perm}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${
                            newUser.permissions[perm]
                              ? "bg-mr-navy text-white border-mr-navy"
                              : "bg-white text-mr-text-muted border-gray-200 hover:border-mr-gold/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newUser.permissions[perm]}
                            onChange={(e) =>
                              setNewUser({
                                ...newUser,
                                permissions: {
                                  ...newUser.permissions,
                                  [perm]: e.target.checked,
                                },
                              })
                            }
                            className="sr-only"
                          />
                          {PERMISSION_LABELS[perm]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateUser}
                    disabled={saving === "create-user"}
                    className="bg-mr-navy hover:bg-mr-navy-light text-white"
                  >
                    {saving === "create-user"
                      ? "Oluşturuluyor..."
                      : "Kullanıcı Oluştur"}
                  </Button>
                </div>
              )}

              {/* User List */}
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.isActive
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50 opacity-60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-mr-navy truncate">
                          {user.fullName}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {user.role === "admin"
                            ? "Yönetici"
                            : user.role === "hr_specialist"
                              ? "İK Uzmanı"
                              : "İK Yöneticisi"}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="destructive" className="text-[10px]">
                            Pasif
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-mr-text-muted mt-0.5">
                        @{user.username}
                        {user.email ? ` · ${user.email}` : ""}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(
                          Object.keys(
                            PERMISSION_LABELS,
                          ) as (keyof UserPermissions)[]
                        ).map((perm) => {
                          const perms = (user.permissions ||
                            {}) as UserPermissions;
                          return perms[perm] ? (
                            <span
                              key={perm}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-mr-gold/10 text-mr-gold"
                            >
                              {PERMISSION_LABELS[perm]}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setEditPerms(
                            (user.permissions ||
                              DEFAULT_PERMISSIONS) as UserPermissions,
                          );
                        }}
                        className="text-xs h-7 px-2"
                      >
                        Yetkiler
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className="text-xs h-7 px-2"
                      >
                        {user.isActive ? "Devre Dışı" : "Aktifleştir"}
                      </Button>
                      {user.username !== "admin" &&
                        (deleteConfirm === user.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-xs h-7 px-2"
                            >
                              Onayla
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs h-7 px-2"
                            >
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(user.id)}
                            className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                          >
                            Sil
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-mr-text-muted text-center py-4">
                    Henüz kullanıcı yok.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-medium text-mr-navy">
              {editingUser.fullName} — Yetki Düzenle
            </h3>
            <div className="space-y-2">
              {(
                Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]
              ).map((perm) => (
                <label
                  key={perm}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <span className="text-sm text-mr-navy">
                    {PERMISSION_LABELS[perm]}
                  </span>
                  <input
                    type="checkbox"
                    checked={editPerms[perm]}
                    onChange={(e) =>
                      setEditPerms({ ...editPerms, [perm]: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-mr-gold focus:ring-mr-gold"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                İptal
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={saving === "update-user"}
                className="bg-mr-navy hover:bg-mr-navy-light text-white"
              >
                {saving === "update-user" ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
