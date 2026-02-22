// ─── Güvenli Veritabanı Sorgu Servisi ───
// AI asistanın SELECT sorguları çalıştırmasını sağlar.
// DELETE, DROP, TRUNCATE, ALTER, UPDATE, INSERT yasaktır.

import { prisma } from "@/lib/prisma";

// ─── Yasaklı SQL komutları ───

const FORBIDDEN_PATTERNS = [
  /\bDELETE\b/i,
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bALTER\b/i,
  /\bUPDATE\b/i,
  /\bINSERT\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bCALL\b/i,
  /\bCOPY\b/i,
  /\bpg_/i,
  /\binformation_schema\b/i,
];

const MAX_ROWS = 50;
const QUERY_TIMEOUT_MS = 5000;

// ─── Validate query safety ───

export function validateQuery(sql: string): { safe: boolean; reason?: string } {
  const trimmed = sql.trim();

  if (!trimmed) {
    return { safe: false, reason: "Boş sorgu." };
  }

  // Must start with SELECT or WITH (CTE)
  if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    return { safe: false, reason: "Sadece SELECT sorguları çalıştırılabilir." };
  }

  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason: `Yasaklı komut tespit edildi: ${pattern.source}`,
      };
    }
  }

  // No semicolons (prevent multi-statement injection)
  const withoutStrings = trimmed.replace(/'[^']*'/g, "");
  if (
    withoutStrings.includes(";") &&
    withoutStrings.indexOf(";") < withoutStrings.length - 1
  ) {
    return { safe: false, reason: "Çoklu sorgu çalıştırılamaz." };
  }

  return { safe: true };
}

// ─── Execute safe query ───

export async function executeSafeQuery(sql: string): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  rowCount?: number;
}> {
  const validation = validateQuery(sql);
  if (!validation.safe) {
    return { success: false, error: validation.reason };
  }

  // Add LIMIT if not present
  let safeSql = sql.trim().replace(/;+$/, "");
  if (!/\bLIMIT\b/i.test(safeSql)) {
    safeSql += ` LIMIT ${MAX_ROWS}`;
  }

  try {
    const result = await Promise.race([
      prisma.$queryRawUnsafe(safeSql) as Promise<Record<string, unknown>[]>,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Sorgu zaman aşımına uğradı (5s).")),
          QUERY_TIMEOUT_MS,
        ),
      ),
    ]);

    // Serialize BigInt values
    const serialized = JSON.parse(
      JSON.stringify(result, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return {
      success: true,
      data: serialized,
      rowCount: serialized.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    return { success: false, error: message };
  }
}

// ─── Extract SQL from AI response ───

const SQL_TAG_REGEX = /\[SQL_QUERY\]([\s\S]*?)\[\/SQL_QUERY\]/g;

export function extractSqlQueries(text: string): string[] {
  const queries: string[] = [];
  let match;
  while ((match = SQL_TAG_REGEX.exec(text)) !== null) {
    const q = match[1].trim();
    if (q) queries.push(q);
  }
  return queries;
}

export function hasSqlQuery(text: string): boolean {
  return /\[SQL_QUERY\]/.test(text);
}

// ─── DB Schema description for system prompt ───

export const DB_SCHEMA_DESCRIPTION = `
## Veritabanı Erişimi
Veritabanından veri sorgulamak için yanıtında [SQL_QUERY]...[/SQL_QUERY] tag'i kullanabilirsin.
Sistem sorguyu çalıştırıp sonucu sana verecek, sen de sonuca göre kullanıcıya yanıt vereceksin.

KURALLAR:
- SADECE SELECT sorguları yazabilirsin. DELETE, UPDATE, INSERT, DROP YASAKTIR.
- Maksimum 50 satır döner. Gerekirse LIMIT kullan.
- Sorgu 5 saniye içinde tamamlanmalı.
- Birden fazla sorgu gerekiyorsa her birini ayrı [SQL_QUERY] tag'inde yaz.
- Sorgu sonuçlarını kullanıcıya ham SQL olarak gösterme, doğal dilde özetle.

TABLO YAPISI:

### departments (Departmanlar)
- id (bigint PK), name (text, unique), is_active (bool), sort_order (int)

### form_configs (Form Yapılandırmaları)
- id (bigint PK), title (text), mode (text), is_published (bool), is_active (bool)

### questions (Sorular)
- id (bigint PK), form_config_id (FK→form_configs), group_label (text), question_text (text), question_type (text), is_required (bool), sort_order (int), options (jsonb)

### applications (Başvurular)
- id (bigint PK), application_no (text unique), form_config_id (FK), department_id (FK→departments), full_name (text), email (text), phone (text), status (text: new/reviewed/shortlisted/rejected/hired), submitted_at (timestamptz), response_summary (jsonb), import_log_id (FK nullable)

### application_responses (Başvuru Yanıtları)
- id (bigint PK), application_id (FK→applications), question_id (FK→questions), answer_text (text), answer_json (jsonb)

### evaluations (AI Değerlendirmeleri)
- id (bigint PK), application_id (FK→applications, unique), overall_score (int 0-100), status (text: pending/completed/failed), report (jsonb), evaluated_at (timestamptz)

### screening_criteria (Ön Eleme Kriterleri)
- id (bigint PK), name (text), description (text), department_id (FK nullable), form_config_id (FK nullable), is_active (bool), criteria_rules (jsonb), pass_threshold (int), use_ai_assist (bool)

### screening_results (Ön Eleme Sonuçları)
- id (bigint PK), application_id (FK), criteria_id (FK), passed (bool), score (int), details (jsonb)

### import_logs (Veri Aktarım Logları)
- id (bigint PK), file_name (text), total_rows (int), imported_count (int), skipped_count (int), status (text), created_at (timestamptz)

### admin_users (Yöneticiler)
- id (bigint PK), email (text unique), full_name (text), role (text)

ÖRNEK SORGULAR:
- Toplam başvuru sayısı: [SQL_QUERY]SELECT COUNT(*) as total FROM applications[/SQL_QUERY]
- Departman bazlı dağılım: [SQL_QUERY]SELECT d.name, COUNT(a.id) as count FROM applications a JOIN departments d ON a.department_id = d.id GROUP BY d.name ORDER BY count DESC[/SQL_QUERY]
- En yüksek puanlı adaylar: [SQL_QUERY]SELECT a.full_name, a.email, e.overall_score, d.name as department FROM evaluations e JOIN applications a ON e.application_id = a.id JOIN departments d ON a.department_id = d.id WHERE e.status = 'completed' ORDER BY e.overall_score DESC LIMIT 10[/SQL_QUERY]
`;
