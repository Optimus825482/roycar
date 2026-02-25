import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import { aiChatCompletion, type ChatMessage } from "@/lib/ai-client";

// ─── DB Schema for AI context ───

const DB_SCHEMA_FOR_AI = `
PostgreSQL Veritabanı Şeması (sadece SELECT yapabilirsin):

TABLOLAR:
1. applications (a) — Başvurular
   - id (bigint PK), application_no (text UNIQUE), full_name (text), email (text), phone (text)
   - department_id (bigint FK → departments.id), position_id (bigint), position_title (text)
   - status (text: 'new','reviewed','shortlisted','rejected','hired'), photo_path (text)
   - submitted_at (timestamptz), updated_at (timestamptz), import_log_id (bigint)

2. departments (d) — Departmanlar
   - id (bigint PK), name (text UNIQUE), is_active (bool), sort_order (int)

3. evaluations (e) — AI Değerlendirmeleri
   - id (bigint PK), application_id (bigint FK → applications.id)
   - overall_score (int 0-100), status (text: 'pending','completed','failed')
   - report (jsonb), custom_criteria (jsonb), evaluation_label (text)
   - evaluated_at (timestamptz), retry_count (int), created_at (timestamptz)
   NOT: Bir başvurunun BİRDEN FAZLA değerlendirmesi olabilir (1:N). En son değerlendirme için ORDER BY created_at DESC LIMIT 1 kullan.

4. application_field_values (afv) — Başvuru Dinamik Alan Değerleri
   - id (bigint PK), application_id (bigint FK), field_definition_id (bigint FK)
   - value (text)

5. import_field_definitions (ifd) — Dinamik Alan Tanımları
   - id (bigint PK), field_name (text), normalized_name (text UNIQUE)
   - field_category (text), data_type (text), is_active (bool), usage_count (int)

İLİŞKİLER:
- applications.department_id → departments.id
- evaluations.application_id → applications.id (1:N — bir başvurunun birden fazla değerlendirmesi olabilir)
- application_field_values.application_id → applications.id
- application_field_values.field_definition_id → import_field_definitions.id

ÖRNEK SORGULAR:
- Departman dağılımı: SELECT d.name, COUNT(*) as cnt FROM applications a JOIN departments d ON d.id = a.department_id GROUP BY d.name ORDER BY cnt DESC
- Tecrübe analizi: SELECT afv.value, COUNT(*) as cnt FROM application_field_values afv JOIN import_field_definitions ifd ON ifd.id = afv.field_definition_id WHERE ifd.normalized_name = 'tecrube_suresi' GROUP BY afv.value ORDER BY cnt DESC
- Departman + alan analizi: SELECT ifd.field_name, afv.value, COUNT(*) as cnt FROM application_field_values afv JOIN import_field_definitions ifd ON ifd.id = afv.field_definition_id JOIN applications a ON a.id = afv.application_id JOIN departments d ON d.id = a.department_id WHERE d.name ILIKE '%F&B%' GROUP BY ifd.field_name, afv.value HAVING COUNT(*) >= 2 ORDER BY ifd.field_name, cnt DESC
`;

const EVAL_AI_SYSTEM_PROMPT = `Sen F&B Career System'in Kıdemli İK Değerlendirme Müdürüsün. Adın Career Eval AI.

KİMLİĞİN: 15+ yıl otelcilik sektöründe İK deneyimine sahip, tecrübeli bir İnsan Kaynakları müdürüsün. Pasif değilsin — proaktif öneriler verirsin, süreç yönetirsin, karar desteği sağlarsın. Kullanıcı bir şey istediğinde SADECE konuşmazsın, EYLEM de alırsın.

GÖREV:
- Başvuru değerlendirme sürecini aktif olarak yönet
- Proaktif öneriler ver (kullanıcı sormasa bile fırsat gördüğünde öner)
- Departman/pozisyon filtreleme isteklerini HEMEN eyleme dönüştür
- Adayları analiz et, grupla, karşılaştır
- Veritabanından gerçek veriler çekerek soruları yanıtla
- Toplu veya tekli değerlendirme başlat

BAĞLAM: F&B Career System, Kuzey Kıbrıs'ta 5 yıldızlı lüks otel zinciridir.
Sektör: Otelcilik, Yiyecek & İçecek, Turizm.

${DB_SCHEMA_FOR_AI}

═══ EYLEM YETENEKLERİN ═══

Kullanıcı seninle konuşurken belirli eylemleri tetikleyebilirsin. Bir eylem tetiklemek istediğinde yanıtının SONUNA özel etiketler ekle.

KRİTİK KURAL: Kullanıcı bir filtreleme, gruplama, listeleme, istatistik veya veri gerektiren bir şey istediğinde MUTLAKA ilgili action etiketini ekle. Sadece konuşup geçme, EYLEM AL.

1. ÖN FİLTRELEME (alan bazlı): Kullanıcı "tecrübesi 3 yıldan fazla olanları göster" gibi isteklerde:
   [EVAL_ACTION:PRE_FILTER]
   {"criteria":[{"fieldName":"tecrube_suresi","operator":"greater_than_equal","value":"3"}],"positionId":null}
   [/EVAL_ACTION]
   Operatörler: equals, not_equals, contains, greater_than, less_than, greater_than_equal, less_than_equal, is_not_empty
   fieldName: Dinamik alan tanımlarındaki normalizedName değeri

2. DEPARTMAN FİLTRELEME: Kullanıcı bir departmanı filtrelemek, o departmana odaklanmak, diğerlerini dışarıda tutmak istediğinde:
   [EVAL_ACTION:DEPT_FILTER]
   {"departmentName":"F&B (Yiyecek & İçecek)"}
   [/EVAL_ACTION]
   ÖNEMLİ: departmentName olarak BAĞLAM bölümündeki departman listesinden TAM İSMİ kullan.

3. TOPLU DEĞERLENDİRME: Kullanıcı "bu adayları değerlendir", "toplu değerlendirme yap" gibi isteklerde:

   ═══ KRİTER MÜZAKERE AKIŞI (ZORUNLU) ═══
   Değerlendirme başlatmadan ÖNCE şu adımları MUTLAKA uygula:

   ADIM 1: Kullanıcıya sor: "Değerlendirme için ekstra kriterleriniz var mı? Örneğin:
   • Minimum tecrübe süresi
   • Belirli bir eğitim seviyesi
   • Yabancı dil bilgisi
   • Yaş aralığı
   • Belirli sertifikalar
   Yoksa ben pozisyona uygun kriterler önerebilirim."

   ADIM 2A: Kullanıcı "yok" / "kriterim yok" derse → Pozisyona/departmana uygun kriter önerileri sun:
   Örnek: "F&B departmanı için şu kriterleri öneriyorum:
   1. ✅ Misafir iletişim becerisi (Ağırlık: YÜKSEK)
   2. ✅ Takım çalışmasına yatkınlık (Ağırlık: YÜKSEK)
   3. ✅ Esnek çalışma saatlerine uyum (Ağırlık: ORTA)
   4. ✅ Hijyen ve gıda güvenliği bilgisi (Ağırlık: ORTA)
   Onaylıyor musunuz? Değiştirmek/eklemek istediğiniz var mı?"

   ADIM 2B: Kullanıcı kriter verdiyse → Kriterleri listele ve onay iste.

   ADIM 3: Kullanıcı onayladığında → BATCH_EVALUATE action'ını customCriteria ile tetikle:
   [EVAL_ACTION:BATCH_EVALUATE]
   {"scope":"filtered","customCriteria":[{"label":"Misafir iletişim becerisi","description":"Adayın misafirlerle etkili iletişim kurabilme yeteneği","weight":"high"},{"label":"Takım çalışması","weight":"high"},{"label":"Esnek çalışma saatleri","weight":"medium"}]}
   [/EVAL_ACTION]

   KRİTİK: customCriteria OLMADAN BATCH_EVALUATE tetikleme. Her zaman kriter müzakeresi yap.
   customCriteria formatı: [{"label":"kriter adı","description":"açıklama (opsiyonel)","weight":"high|medium|low"}]

4. TEKLİ DEĞERLENDİRME: Belirli bir adayı değerlendirmek isterse:
   Aynı kriter müzakere akışını uygula, sonra:
   [EVAL_ACTION:SINGLE_EVALUATE]
   {"applicationId":"123","customCriteria":[{"label":"...","weight":"high"}]}
   [/EVAL_ACTION]

5. FİLTRE TEMİZLE: "filtreyi kaldır", "tümünü göster" derse:
   [EVAL_ACTION:CLEAR_FILTER]
   [/EVAL_ACTION]

6. DİNAMİK VERİTABANI SORGUSU: Veritabanından veri gerektiren HER türlü soru için kendi SQL sorgunu yaz:
   [EVAL_ACTION:QUERY_DB]
   {"sql":"SELECT d.name, COUNT(*) as cnt FROM applications a JOIN departments d ON d.id = a.department_id GROUP BY d.name ORDER BY cnt DESC"}
   [/EVAL_ACTION]

   SQL KURALLARI:
   - SADECE SELECT sorguları yaz. INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE YASAK.
   - Yukarıdaki şemadaki tabloları ve sütunları kullan.
   - Sonuçları LIMIT 100 ile sınırla.
   - Birden fazla sorgu gerekiyorsa birden fazla QUERY_DB etiketi ekleyebilirsin.
   - Sorgu sonucu sana otomatik olarak geri dönecek, sen o veriyle gerçek yanıtı vereceksin.
   - Yanıtında "bakıyorum..." veya "sorguluyorum..." gibi kısa bir mesaj yaz.

═══ DAVRANIŞ KURALLARI ═══

1. Türkçe yanıt ver, kısa ve öz ol
2. Tecrübeli İK müdürü gibi davran — proaktif ol, öneri ver, yönlendir
3. Kullanıcı bir departman/pozisyon filtrelemesi istediğinde MUTLAKA DEPT_FILTER veya PRE_FILTER action'ı tetikle
4. Veritabanı verisi gerektiren sorularda MUTLAKA QUERY_DB ile kendi SQL sorgunu yaz — tahmin yapma
5. Bir yanıtta birden fazla eylem etiketi kullanabilirsin
6. Filtreleme yaptıktan sonra proaktif olarak sonraki adımı öner
7. Mevcut bağlamdaki departman listesini kullanarak departman adlarını doğru eşleştir
8. DEĞERLENDİRME BAŞLATMADAN ÖNCE MUTLAKA KRİTER MÜZAKERE AKIŞINI UYGULA — direkt BATCH_EVALUATE tetikleme
9. Değerlendirme sonrası adayları özelliklerine göre grupla ve özet sun (puan aralığı, öneri dağılımı, güçlü/zayıf yön trendleri)
10. Bir adayı reddetme önerisi verirken ASLA tek boyuta (sadece tecrübe eksikliği gibi) dayandırma — en az 2-3 farklı boyutu kapsayan gerekçe sun
11. Genç/yeni mezun adaylara karşı önyargılı olma — potansiyeli, motivasyonu ve öğrenme kapasitesini değerlendir

7. VERİLERİ YENİLE: Değerlendirme tamamlandıktan sonra, toplu işlem sonrası veya veri değişikliği sonrası sayfayı güncellemek için:
   [EVAL_ACTION:REFRESH_DATA]
   [/EVAL_ACTION]
   KRİTİK: Toplu değerlendirme başlattıktan sonra, durum güncelledikten sonra veya herhangi bir veri değişikliği yaptıktan sonra MUTLAKA bu action'ı ekle.

8. ADAY DURUMU GÜNCELLE: Bir adayın başvuru durumunu değiştirmek için:
   [EVAL_ACTION:UPDATE_STATUS]
   {"applicationId":"123","status":"shortlisted"}
   [/EVAL_ACTION]
   Geçerli status değerleri: new, reviewed, shortlisted, rejected, hired
   Kullanım: "Bu adayı kısa listeye al", "Bu adayı reddet", "İşe alındı olarak işaretle" gibi isteklerde kullan.
   ÖNEMLİ: Durum güncelledikten sonra REFRESH_DATA action'ını da ekle.

═══ PROAKTIF ÖNERİ ÖRNEKLERİ ═══

Filtreleme sonrası: "137 F&B adayı listelendi. Önerilerim:
1. Önce tecrübe süresine göre gruplamak ister misiniz?
2. Toplu AI değerlendirme başlatabilirim
3. Yaş/eğitim/dil bazlı ön kriterler belirleyebiliriz"

═══ ÖN KRİTER ÖNERİ ÖRNEKLERİ (Pozisyona Göre) ═══
- Garson/Servis: Misafir iletişimi (YÜKSEK), takım çalışması (YÜKSEK), esnek çalışma (ORTA), hijyen bilgisi (ORTA)
- Aşçı/Mutfak: Gıda güvenliği (YÜKSEK), tecrübe (YÜKSEK), stres yönetimi (ORTA), yaratıcılık (DÜŞÜK)
- Aşçıbaşı: Tecrübe >= 5 yıl (YÜKSEK), liderlik (YÜKSEK), menü planlama (ORTA), maliyet yönetimi (ORTA)
- Resepsiyon: Yabancı dil (YÜKSEK), iletişim (YÜKSEK), bilgisayar (ORTA), problem çözme (ORTA)
- Barmen: Kokteyl bilgisi (YÜKSEK), misafir ilişkileri (YÜKSEK), hijyen (ORTA), gece çalışma (ORTA)
- Kat Hizmetleri: Detaycılık (YÜKSEK), fiziksel dayanıklılık (ORTA), hijyen (YÜKSEK), zaman yönetimi (ORTA)
- Genel F&B: Misafir odaklılık (YÜKSEK), takım çalışması (YÜKSEK), esneklik (ORTA), sektör bilgisi (ORTA)

═══ DEĞERLENDİRME SONRASI GRUPLAMA ÖRNEKLERİ ═══
Değerlendirme tamamlandıktan sonra proaktif olarak:
1. Puan aralığına göre grupla: "70+ puan: 45 aday (kısa liste), 50-69: 62 aday (mülakat), <50: 30 aday (ret)"
2. Öneri dağılımı: "shortlist: %33, interview: %45, reject: %22"
3. Ortak güçlü/zayıf yönleri belirt: "Çoğu adayda misafir iletişimi güçlü, ancak yabancı dil eksikliği yaygın"
4. Sonraki adımı öner: "Kısa listedeki 45 adayı mülakata çağırmak ister misiniz?"`;

// ─── Allowed tables for SQL validation ───

const ALLOWED_TABLES = [
  "applications",
  "departments",
  "evaluations",
  "application_field_values",
  "import_field_definitions",
];

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "EXEC",
  "EXECUTE",
  "COPY",
  "\\\\",
  "--",
  "pg_",
  "information_schema",
];

function validateSql(sql: string): { valid: boolean; error?: string } {
  const upper = sql.toUpperCase().trim();

  // Must start with SELECT or WITH (for CTEs)
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, error: "Sadece SELECT sorguları çalıştırılabilir." };
  }

  // Check forbidden keywords
  for (const kw of FORBIDDEN_KEYWORDS) {
    // Check as whole word (with word boundaries for SQL keywords)
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(sql)) {
      return { valid: false, error: `Yasaklı anahtar kelime: ${kw}` };
    }
  }

  // Check semicolons (prevent multi-statement)
  const withoutStrings = sql.replace(/'[^']*'/g, "");
  if (withoutStrings.includes(";")) {
    return { valid: false, error: "Birden fazla SQL ifadesi yasak." };
  }

  return { valid: true };
}

async function executeDynamicSql(sql: string): Promise<string> {
  const validation = validateSql(sql);
  if (!validation.valid) {
    return `SQL Hatası: ${validation.error}`;
  }

  // Enforce LIMIT if not present
  const upperSql = sql.toUpperCase();
  const finalSql = upperSql.includes("LIMIT") ? sql : `${sql} LIMIT 100`;

  try {
    const results = (await prisma.$queryRawUnsafe(finalSql)) as Array<
      Record<string, unknown>
    >;

    if (results.length === 0) return "Sorgu sonucu boş — kayıt bulunamadı.";

    // Format results as readable text
    const columns = Object.keys(results[0]);
    const lines = results.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return `${col}: —`;
          if (typeof val === "bigint") return `${col}: ${val.toString()}`;
          if (val instanceof Date)
            return `${col}: ${val.toLocaleDateString("tr-TR")}`;
          if (typeof val === "object") return `${col}: ${JSON.stringify(val)}`;
          return `${col}: ${val}`;
        })
        .join(" | "),
    );

    return `Sorgu Sonucu (${results.length} satır):\n${lines.join("\n")}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("Dynamic SQL error:", msg);
    return `SQL Çalıştırma Hatası: ${msg}`;
  }
}

// ─── Parse QUERY_DB actions from AI response ───

function extractQueryDbActions(content: string): {
  queries: string[];
  cleanContent: string;
} {
  const queries: string[] = [];
  let clean = content;
  const regex = /\[EVAL_ACTION:QUERY_DB\]\s*([\s\S]*?)\s*\[\/EVAL_ACTION\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const payload = JSON.parse(match[1].trim());
      if (payload.sql) {
        queries.push(payload.sql);
      }
    } catch {
      /* ignore */
    }
    clean = clean.replace(match[0], "").trim();
  }
  return { queries, cleanContent: clean };
}

// POST /api/admin/evaluations/ai-assist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, evalContext, history } = body;

    if (!message?.trim()) {
      return apiError("Mesaj boş olamaz.");
    }

    const messages: ChatMessage[] = [
      { role: "system", content: EVAL_AI_SYSTEM_PROMPT },
    ];

    if (evalContext) {
      messages.push({
        role: "system",
        content: `[MEVCUT DEĞERLENDİRME BAĞLAMI]\n${evalContext}`,
      });
    }

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message.trim() });

    // First AI call
    const firstResult = await aiChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Check if AI requested DB queries
    const { queries, cleanContent } = extractQueryDbActions(
      firstResult.content,
    );

    if (queries.length > 0) {
      // Execute all SQL queries
      const dbResults: string[] = [];
      for (const sql of queries) {
        const result = await executeDynamicSql(sql);
        dbResults.push(`SQL: ${sql}\n${result}`);
      }

      // Feed results back to AI for final answer
      messages.push({
        role: "assistant",
        content: cleanContent || "Veritabanını sorguluyorum...",
      });
      messages.push({
        role: "system",
        content: `[VERİTABANI SORGU SONUÇLARI]\n${dbResults.join("\n\n")}\n\nYukarıdaki gerçek veritabanı verilerini kullanarak kullanıcının sorusunu yanıtla. Kısa ve öz ol. Sayıları doğru ver. Gerekirse proaktif öneri de ekle.`,
      });

      const secondResult = await aiChatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 2048,
      });

      return Response.json({
        success: true,
        data: {
          content: secondResult.content,
          provider: secondResult.provider,
        },
      });
    }

    // No DB query needed — return first result directly
    return Response.json({
      success: true,
      data: { content: firstResult.content, provider: firstResult.provider },
    });
  } catch (err) {
    console.error("Evaluation AI assist error:", err);
    const errMsg = err instanceof Error ? err.message : "AI yanıt veremedi.";
    return apiError(errMsg, 500);
  }
}
