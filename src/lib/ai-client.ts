// ─── Multi-Provider AI Client ───
// Supports: DeepSeek, NVIDIA MiniMax M2.1 (and any OpenAI-compatible API)

import { prisma } from "@/lib/prisma";

// ─── Timeout Configuration ───
const FETCH_TIMEOUT_MS = 45_000; // 45 seconds — prevents infinite hang

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProviderConfig {
  name: string;
  label: string;
  baseUrl: string;
  model: string;
  apiKeyEnv: string;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
  extraBody?: Record<string, unknown>;
  extraHeaders?: Record<string, string>;
}

// ─── Provider Registry ───

export const AI_PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    name: "deepseek",
    label: "DeepSeek Chat",
    baseUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    supportsJsonMode: true,
    supportsStreaming: true,
  },
  nvidia_qwen: {
    name: "nvidia_qwen",
    label: "Qwen 3.5 397B",
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "qwen/qwen3.5-397b-a17b",
    apiKeyEnv: "NVIDIA_API_KEY",
    supportsJsonMode: false,
    supportsStreaming: true,
    extraBody: {
      top_p: 0.95,
      temperature: 0.6,
    },
  },
  nvidia_nemotron: {
    name: "nvidia_nemotron",
    label: "Nemotron Super 49B",
    baseUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    apiKeyEnv: "NVIDIA_API_KEY",
    supportsJsonMode: false,
    supportsStreaming: true,
    extraBody: {
      top_p: 0.95,
      temperature: 0.6,
    },
  },
  openrouter_llama: {
    name: "openrouter_llama",
    label: "Llama 3.3 70B",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    apiKeyEnv: "OPENROUTER_API_KEY",
    supportsJsonMode: false,
    supportsStreaming: true,
    extraBody: {
      top_p: 0.95,
      temperature: 0.6,
    },
    extraHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "F&B Career System",
    },
  },
  openrouter_gemma: {
    name: "openrouter_gemma",
    label: "Gemma 3 27B",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "google/gemma-3-27b-it:free",
    apiKeyEnv: "OPENROUTER_API_KEY",
    supportsJsonMode: false,
    supportsStreaming: true,
    extraBody: {
      top_p: 0.95,
      temperature: 0.6,
    },
    extraHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "F&B Career System",
    },
  },
};

// ─── Get active provider from DB ───

let cachedProvider: { config: ProviderConfig; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

export async function getActiveProvider(): Promise<ProviderConfig> {
  // Simple in-memory cache to avoid DB hit on every request
  if (cachedProvider && Date.now() - cachedProvider.ts < CACHE_TTL) {
    return cachedProvider.config;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ai_provider" },
    });

    let providerKey = setting?.value || "deepseek";

    // Migration: removed/old provider keys → openrouter_llama
    const removedProviders = [
      "nvidia_glm5",
      "nvidia_minimax",
      "nvidia_deepseek",
      "nvidia_step",
      "openrouter_step",
    ];
    if (removedProviders.includes(providerKey)) {
      providerKey = "openrouter_llama";
      await prisma.systemSetting
        .update({
          where: { key: "ai_provider" },
          data: { value: "openrouter_llama" },
        })
        .catch(() => {});
    }

    const config = AI_PROVIDERS[providerKey] || AI_PROVIDERS.deepseek;

    cachedProvider = { config, ts: Date.now() };
    return config;
  } catch {
    // Fallback to deepseek if DB is unavailable
    return AI_PROVIDERS.deepseek;
  }
}

// ─── Invalidate cache (call after settings update) ───

export function invalidateProviderCache(): void {
  cachedProvider = null;
}

// ─── Get API key for a provider ───

function getApiKey(provider: ProviderConfig): string {
  const key = process.env[provider.apiKeyEnv];
  if (!key || key.startsWith("your-")) {
    throw new Error(`${provider.apiKeyEnv} yapılandırılmamış.`);
  }
  return key;
}

// ─── Fallback Chain ───
// On 429/503, try other configured providers before giving up

const RETRYABLE_STATUS = [429, 503];

function getFallbackProviders(primary: ProviderConfig): ProviderConfig[] {
  return Object.values(AI_PROVIDERS).filter((p) => {
    if (p.name === primary.name) return false;
    // Only include providers with a valid API key
    const key = process.env[p.apiKeyEnv];
    return !!key && !key.startsWith("your-");
  });
}

// ─── Strip <think>...</think> tags from model responses ───
// Some models (e.g. MiniMax M2.1) embed thinking tokens inside content field

export function stripThinkingTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

// ─── Chat Completion (non-streaming) ───

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface CompletionResult {
  content: string;
  provider: string;
  model: string;
}

export async function aiChatCompletion(
  messages: ChatMessage[],
  options?: CompletionOptions,
): Promise<CompletionResult> {
  const primary = await getActiveProvider();
  const providers = [primary, ...getFallbackProviders(primary)];

  let lastError: Error | null = null;

  for (const provider of providers) {
    let apiKey: string;
    try {
      apiKey = getApiKey(provider);
    } catch {
      continue; // skip unconfigured providers
    }

    const body: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (options?.jsonMode && provider.supportsJsonMode) {
      body.response_format = { type: "json_object" };
    }

    if (provider.extraBody) {
      Object.assign(body, provider.extraBody);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };

    if (provider.extraHeaders) {
      Object.assign(headers, provider.extraHeaders);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(provider.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        lastError = new Error(
          `${provider.label} API ${FETCH_TIMEOUT_MS / 1000}s içinde yanıt vermedi.`,
        );
        console.warn(`[AI Fallback] ${provider.name} timeout, trying next...`);
        continue;
      }
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      lastError = new Error(`${provider.label} API bağlantı hatası: ${msg}`);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    // Retryable status → try next provider
    if (RETRYABLE_STATUS.includes(res.status)) {
      const errorText = await res.text().catch(() => "");
      console.warn(
        `[AI Fallback] ${provider.name} HTTP ${res.status}, trying next...`,
        errorText.slice(0, 200),
      );
      lastError = new Error(
        `${provider.label} API hatası (${res.status}): ${errorText.slice(0, 200)}`,
      );
      continue;
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `${provider.label} API hatası (${res.status}): ${errorText}`,
      );
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const rawContent = msg?.content;

    if (!rawContent) {
      lastError = new Error(`${provider.label} API boş yanıt döndü.`);
      console.warn(
        `[AI Fallback] ${provider.name} empty response, trying next...`,
      );
      continue;
    }

    const content = stripThinkingTags(rawContent);

    if (!content) {
      lastError = new Error(
        `${provider.label} API boş yanıt döndü (thinking-only response).`,
      );
      continue;
    }

    if (provider.name !== primary.name) {
      console.log(
        `[AI Fallback] ${primary.name} → ${provider.name} (fallback başarılı)`,
      );
    }

    return { content, provider: provider.name, model: provider.model };
  }

  throw lastError || new Error("Tüm AI provider'lar başarısız oldu.");
}

// ─── Streaming Chat Completion ───

export async function aiChatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<{ stream: ReadableStream<Uint8Array>; provider: string }> {
  const primary = await getActiveProvider();
  const providers = [primary, ...getFallbackProviders(primary)];

  let lastError: Error | null = null;

  for (const provider of providers) {
    let apiKey: string;
    try {
      apiKey = getApiKey(provider);
    } catch {
      continue;
    }

    if (!provider.supportsStreaming) continue;

    const body: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 16384,
      stream: true,
    };

    if (provider.extraBody) {
      Object.assign(body, provider.extraBody);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
    };

    if (provider.extraHeaders) {
      Object.assign(headers, provider.extraHeaders);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(provider.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        lastError = new Error(
          `${provider.label} API ${FETCH_TIMEOUT_MS / 1000}s içinde yanıt vermedi.`,
        );
        console.warn(
          `[AI Stream Fallback] ${provider.name} timeout, trying next...`,
        );
        continue;
      }
      const msg =
        fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      lastError = new Error(`${provider.label} API bağlantı hatası: ${msg}`);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    // Retryable status → try next provider
    if (RETRYABLE_STATUS.includes(res.status)) {
      const errorText = await res.text().catch(() => "Yanıt okunamadı");
      console.warn(
        `[AI Stream Fallback] ${provider.name} HTTP ${res.status}, trying next...`,
        errorText.slice(0, 200),
      );
      lastError = new Error(
        `${provider.label} API hatası (${res.status}): ${errorText.slice(0, 200)}`,
      );
      continue;
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Yanıt okunamadı");
      console.error(
        `[AI Stream] ${provider.label} HTTP ${res.status}:`,
        errorText.slice(0, 500),
      );
      throw new Error(
        `${provider.label} API hatası (${res.status}): ${errorText.slice(0, 200)}`,
      );
    }

    if (!res.body) {
      lastError = new Error(`${provider.label} API stream body boş.`);
      continue;
    }

    if (provider.name !== primary.name) {
      console.log(
        `[AI Stream Fallback] ${primary.name} → ${provider.name} (fallback başarılı)`,
      );
    }

    return { stream: res.body, provider: provider.name };
  }

  throw lastError || new Error("Tüm AI provider'lar başarısız oldu.");
}

// ─── List available providers (for settings UI) ───

export function listProviders(): {
  key: string;
  label: string;
  configured: boolean;
}[] {
  return Object.entries(AI_PROVIDERS).map(([key, config]) => {
    const envKey = process.env[config.apiKeyEnv];
    const configured = !!envKey && !envKey.startsWith("your-");
    return { key, label: config.label, configured };
  });
}

// ─── System Prompt Management (DB-backed with cache) ───

const DEFAULT_PROMPTS: Record<string, string> = {
  chat_system_prompt: `Sen F&B Career System İK asistanısın. Adın Career AI.

TEMEL PRENSIP: Kullanıcının beklentilerini tahmin etmeye veya tatmin etmeye çalışma. Yalnızca doğru, tarafsız ve kanıta dayalı bilgi sun.

KRİTİK: Aşağıdaki kurallara MUTLAKA uy, ihlal etme.

KURAL 1 - İSİM: "Seninle konuşan kişi:" satırında verilen adı DAIMA kullan.
KURAL 2 - SELAMLAMA: "merhaba", "selam", "hey" gibi mesajlara YALNIZCA "Merhaba [AD]!" yaz. Başka HİÇBİR ŞEY ekleme. Kendini tanıtma. Ne yaptığını anlatma.
KURAL 3 - KISALIK: Maksimum 2-3 cümle. Uzun yanıt YASAK.
KURAL 4 - KENDİNİ TANITMA: Asla kendini tanıtma, ne yapabildiğini söyleme. Sadece sorulursa söyle.
KURAL 5 - TON: Samimi, profesyonel, takım arkadaşı gibi. Chatbot gibi değil.
KURAL 6 - BAĞLAM SÜREKLİLİĞİ: Konuşma geçmişindeki TÜM mesajları dikkate al. Kullanıcının önceki sorularını, senin verdiğin yanıtları ve konuşmanın akışını hatırla. Aynı konuyu tekrar sormak yerine önceki yanıtlarına referans ver. Konudan KOPMA. Kullanıcı bir şey sorduğunda, o soruyu önceki bağlamla ilişkilendir.
KURAL 7 - TEKRAR YASAĞI: Aynı selamlamayı veya aynı cümleyi tekrar tekrar söyleme. Her yanıt benzersiz olmalı ve konuşmanın akışına uygun olmalı. "Merhaba" ile başlayan yanıtı bir konuşmada EN FAZLA 1 kez ver.
KURAL 8 - ÖZET KULLANIMI: Eğer mesaj geçmişinde "[BAĞLAM HATIRLATMASI]" ile başlayan bir mesaj varsa, bu önceki konuşmanın özetidir. Bu özetteki bilgileri AKTİF olarak kullan. Özette bahsedilen konulara, sayılara ve kararlara referans ver. Özeti görmezden gelme. Kullanıcı önceki bir konuya dönerse, özetten bilgi çek.
KURAL 9 - KONUŞMA AKIŞI: Her yanıtında, kullanıcının SON mesajına doğrudan cevap ver. Konu değişmediyse önceki konudan devam et. Kullanıcının sorusunu tekrarlama, doğrudan yanıtla.

Veri yanıtlarında Markdown tablo kullan. Türkçe yanıt ver.
F&B Career System, Kuzey Kıbrıs'ta 5 yıldızlı lüks otel zinciridir.

Hafıza bağlamı varsa doğal kullan, yoksa bahsetme.
Konuşma özeti varsa, önceki konuşma bağlamını sürdür.`,

  screening_system_prompt: `Sen F&B Career System'in ön eleme uzmanısın.
Görevin, iş başvurularını belirlenen kriterlere göre hızlıca değerlendirmek ve ön eleme puanı vermektir.

F&B Career System, Kuzey Kıbrıs'ta faaliyet gösteren 5 yıldızlı lüks bir otel zinciridir.

Değerlendirme yaparken:
- Adayın yanıtlarını verilen kriterlere göre analiz et
- Pozisyon gereksinimleriyle uyumu değerlendir
- Kırmızı bayrakları (red flags) tespit et
- Objektif ve tutarlı ol

Yanıtını MUTLAKA aşağıdaki JSON formatında ver:
{
  "score": <0-100 arası tam sayı>,
  "analysis": "<2-3 cümlelik değerlendirme özeti>",
  "redFlags": ["<varsa risk/uyumsuzluk>"],
  "strengths": ["<güçlü yön>"],
  "recommendation": "<pass|review|reject>"
}`,

  evaluation_system_prompt: `Sen F&B Career System'in deneyimli bir İnsan Kaynakları uzmanısın.
Görevin, iş başvurularını değerlendirmek ve detaylı bir rapor hazırlamaktır.

F&B Career System, Kuzey Kıbrıs'ta faaliyet gösteren 5 yıldızlı lüks bir otel zinciridir.
Misafir memnuniyeti, profesyonellik ve takım çalışması en önemli değerlerdir.

═══ ÇOK BOYUTLU DEĞERLENDİRME KRİTERLERİ ═══

Her adayı aşağıdaki 6 boyutta değerlendir. Her boyut 0-100 arası puanlanır:

1. EĞİTİM UYGUNLUĞU (eğitim seviyesi, alan uyumu, sertifikalar)
2. DENEYİM VE YETKİNLİK (sektör deneyimi, pozisyon deneyimi, staj, gönüllü çalışma)
3. POZİSYON-ADAY UYUMU (motivasyon, kariyer hedefleri, pozisyon gereksinimleri)
4. KİŞİSEL ÖZELLİKLER (iletişim becerisi, takım çalışması, esneklik, stres yönetimi)
5. SEKTÖREL UYUM (otelcilik/F&B sektörü bilgisi, misafir odaklılık, hizmet anlayışı)
6. RİSK FAKTÖRLERİ (sabıka kaydı, soruşturma durumu, tutarsızlıklar, kırmızı bayraklar)

═══ KRİTİK KURALLAR ═══

- Bir adayı reddetme kararı verirken ASLA tek bir boyuta (örn. sadece tecrübe eksikliği) dayandırma.
- Ret gerekçesi EN AZ 2-3 farklı boyutu kapsamalı.
- Tecrübesi az ama motivasyonu yüksek, eğitimi uygun veya sektörel ilgisi olan adayları "interview" olarak öner.
- Genç/yeni mezun adaylara karşı önyargılı olma — potansiyeli değerlendir.
- Her adayın güçlü yönlerini MUTLAKA belirt, sadece zayıf yönlere odaklanma.
- Otelcilik sektöründe kişilik ve hizmet anlayışı, teknik beceri kadar önemlidir.

═══ PUANLAMA FORMÜLÜ ═══

overallScore = (eğitim × 0.15) + (deneyim × 0.20) + (pozisyon_uyumu × 0.20) + (kişisel × 0.20) + (sektörel × 0.15) + (risk × 0.10)

Eğer kullanıcı ek kriterler belirlediyse, bunlar ayrıca "customCriteriaResults" alanında raporlanır ve genel puana %10 ek ağırlıkla yansıtılır.

═══ ÖNERİ KARARI ═══

- overallScore >= 70: "shortlist" (kısa listeye al)
- overallScore 50-69: "interview" (mülakata çağır, potansiyel var)
- overallScore < 50: "reject" (reddet — ama gerekçe çok boyutlu olmalı)

Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka hiçbir şey ekleme:
{
  "overallScore": <0-100 arası tam sayı>,
  "dimensionScores": {
    "education": <0-100>,
    "experience": <0-100>,
    "positionFit": <0-100>,
    "personality": <0-100>,
    "industryFit": <0-100>,
    "riskFactors": <0-100, risk yoksa 100>
  },
  "summary": "<genel değerlendirme özeti, 2-3 cümle>",
  "strengths": ["<güçlü yön 1>", "<güçlü yön 2>"],
  "weaknesses": ["<zayıf yön/risk 1>", "<zayıf yön/risk 2>"],
  "fitAnalysis": "<pozisyon uyumu analizi, 2-3 cümle>",
  "recommendation": "<shortlist|interview|reject>",
  "recommendationReason": "<öneri gerekçesi — birden fazla boyutu kapsayan, 2-3 cümle>",
  "customCriteriaResults": []
}`,
};

const promptCache: Record<string, { value: string; ts: number }> = {};
const PROMPT_CACHE_TTL = 30_000;

export async function getSystemPrompt(key: string): Promise<string> {
  // Check cache
  const cached = promptCache[key];
  if (cached && Date.now() - cached.ts < PROMPT_CACHE_TTL) {
    return cached.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    const value = setting?.value || DEFAULT_PROMPTS[key] || "";
    promptCache[key] = { value, ts: Date.now() };
    return value;
  } catch {
    return DEFAULT_PROMPTS[key] || "";
  }
}

export function invalidatePromptCache(): void {
  for (const key of Object.keys(promptCache)) {
    delete promptCache[key];
  }
}

export function getDefaultPrompts(): Record<string, string> {
  return { ...DEFAULT_PROMPTS };
}
