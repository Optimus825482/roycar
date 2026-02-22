// ─── Veri Aktarımı Servisi ───

import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Sütun eşleştirme haritası (CSV/XLSX sütun adları → sistem alanları)
const COLUMN_MAP: Record<string, string> = {
  // Türkçe sütun adları
  "ad soyad": "fullName",
  "adiniz soyadiniz": "fullName",
  adsoyad: "fullName",
  ad: "fullName",
  isim: "fullName",
  "tam ad": "fullName",
  "e-posta": "email",
  "e posta": "email",
  eposta: "email",
  email: "email",
  mail: "email",
  telefon: "phone",
  "telefon numaraniz": "phone",
  tel: "phone",
  "cep telefonu": "phone",
  departman: "department",
  "basvurdugunuz departman": "department",
  "basvurdugunuz departman/ pozisyon": "department",
  "basvurdugunuz departman pozisyon": "department",
  bölüm: "department",
  pozisyon: "department",
  "basvuru tarihi": "submittedAt",
  "zaman damgasi": "submittedAt",
  tarih: "submittedAt",
  durum: "status",
  // İngilizce
  "full name": "fullName",
  name: "fullName",
  phone: "phone",
  department: "department",
  date: "submittedAt",
  status: "status",
};

// Header olma olasılığını belirleyen anahtar kelimeler
const HEADER_KEYWORDS = [
  "ad",
  "soyad",
  "isim",
  "name",
  "email",
  "e-posta",
  "eposta",
  "telefon",
  "phone",
  "departman",
  "department",
  "tarih",
  "date",
  "cinsiyet",
  "gender",
  "sehir",
  "şehir",
  "city",
  "bölüm",
  "üniversite",
  "okul",
  "staj",
  "pozisyon",
  "durum",
  "status",
  "doğum",
  "baba",
  "anne",
  "soruşturma",
  "sabıka",
  "lojman",
  "zaman",
  "başvuru",
  "resim",
  "fotoğraf",
];

function normalizeColumnName(col: string): string {
  return col
    .toLowerCase()
    .trim()
    .replace(/[_\-\.]/g, " ")
    .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = normalizeColumnName(header);
    // Direct match
    if (COLUMN_MAP[normalized]) {
      mapping[header] = COLUMN_MAP[normalized];
      continue;
    }
    // Partial match — check if any known key is contained in the header
    for (const [knownKey, sysField] of Object.entries(COLUMN_MAP)) {
      if (normalized.includes(knownKey) || knownKey.includes(normalized)) {
        if (!mapping[header]) {
          mapping[header] = sysField;
        }
      }
    }
  }
  return mapping;
}

// ─── Akıllı Header Satırı Tespiti ───
// CSV/XLSX'te bazen ilk satır(lar) gerçek header değil (Column1, Column2 gibi).
// Gerçek header satırını bulmak için ilk N satırı analiz eder.

function scoreAsHeader(values: string[]): number {
  let score = 0;
  for (const val of values) {
    if (!val || typeof val !== "string") continue;
    const lower = val.toLowerCase().trim();
    // "Column1", "Column2" gibi otomatik isimler → düşük skor
    if (/^column\d+$/i.test(lower)) continue;
    // Bilinen header keyword'lerinden birini içeriyor mu?
    for (const kw of HEADER_KEYWORDS) {
      if (lower.includes(kw)) {
        score += 2;
        break;
      }
    }
    // Tamamen sayısal veya tarih gibi görünüyorsa → veri satırı, header değil
    if (/^\d{4}[\/-]\d{2}[\/-]\d{2}/.test(lower)) continue;
    if (/^\d+$/.test(lower)) continue;
    // Kısa, anlamlı metin → muhtemelen header
    if (lower.length > 2 && lower.length < 80 && !/^\d/.test(lower)) {
      score += 1;
    }
  }
  return score;
}

export function detectHeaderRow(allRows: string[][]): {
  headerRowIndex: number;
  headers: string[];
  dataRows: string[][];
} {
  // İlk 5 satırı kontrol et
  const checkCount = Math.min(5, allRows.length);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < checkCount; i++) {
    const score = scoreAsHeader(allRows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const headers = allRows[bestIndex].map((h) =>
    typeof h === "string" ? h.trim() : String(h),
  );
  const dataRows = allRows.slice(bestIndex + 1);

  return { headerRowIndex: bestIndex, headers, dataRows };
}

// ─── Parse fonksiyonları (raw rows döndüren versiyonlar) ───

export function parseCSVRaw(content: string): string[][] {
  const result = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: true,
    delimiter: "", // auto-detect
  });
  return result.data;
}

export function parseXLSXRaw(buffer: ArrayBuffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  });
  return rows as string[][];
}

// Header-aware parse: raw rows → detect header → return keyed rows
export function parseCSV(content: string): {
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
} {
  const rawRows = parseCSVRaw(content);
  if (rawRows.length === 0) return { headers: [], rows: [], headerRowIndex: 0 };

  const { headerRowIndex, headers, dataRows } = detectHeaderRow(rawRows);

  const rows: Record<string, string>[] = dataRows
    .filter((r) => r.some((cell) => cell && String(cell).trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] != null ? String(r[i]).trim() : "";
      });
      return obj;
    });

  return { headers, rows, headerRowIndex };
}

export function parseXLSX(buffer: ArrayBuffer): {
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
} {
  const rawRows = parseXLSXRaw(buffer);
  if (rawRows.length === 0) return { headers: [], rows: [], headerRowIndex: 0 };

  const { headerRowIndex, headers, dataRows } = detectHeaderRow(rawRows);

  const rows: Record<string, string>[] = dataRows
    .filter((r) => r.some((cell) => cell && String(cell).trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] != null ? String(r[i]).trim() : "";
      });
      return obj;
    });

  return { headers, rows, headerRowIndex };
}

interface ImportResult {
  importLogId: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: { row: number; reason: string }[];
}

export async function importApplications(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  fileName: string,
  formConfigId: bigint,
  headerRowIndex: number = 0,
): Promise<ImportResult> {
  const errors: { row: number; reason: string }[] = [];
  let importedCount = 0;
  let skippedCount = 0;

  // Create import log
  const importLog = await prisma.importLog.create({
    data: {
      fileName,
      totalRows: rows.length,
      importedCount: 0,
      skippedCount: 0,
      status: "processing",
    },
  });

  // Reverse mapping: system field → CSV column
  const reverseMap: Record<string, string> = {};
  for (const [csvCol, sysField] of Object.entries(columnMapping)) {
    if (sysField && sysField !== "_skip") {
      reverseMap[sysField] = csvCol;
    }
  }

  // Get departments for name matching
  const departments = await prisma.department.findMany();
  const deptMap = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));

  // Excel/CSV satır numarası = headerRowIndex + 1 (header) + i + 1 (1-indexed)
  const rowOffset = headerRowIndex + 2;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + rowOffset;
    try {
      const fullName = row[reverseMap.fullName]?.trim();
      const email = row[reverseMap.email]?.trim().toLowerCase();
      const phone = row[reverseMap.phone]?.trim() || "";
      const deptName = row[reverseMap.department]?.trim() || "";

      if (!fullName || !email) {
        errors.push({ row: excelRow, reason: "Ad veya e-posta eksik" });
        skippedCount++;
        continue;
      }

      // Basic email validation
      if (!email.includes("@")) {
        errors.push({ row: excelRow, reason: `Geçersiz e-posta: ${email}` });
        skippedCount++;
        continue;
      }

      // Find department
      let departmentId = deptMap.get(deptName.toLowerCase());
      if (!departmentId) {
        // Try partial match
        for (const [name, id] of deptMap) {
          if (
            name.includes(deptName.toLowerCase()) ||
            deptName.toLowerCase().includes(name)
          ) {
            departmentId = id;
            break;
          }
        }
      }
      if (!departmentId) {
        departmentId = departments[0]?.id;
      }

      // Build responseSummary from remaining columns (duplicate check'ten önce lazım)
      const responseSummary: Record<string, string> = {
        fullName,
        email,
        phone,
      };
      for (const [csvCol, value] of Object.entries(row)) {
        if (csvCol === reverseMap.fullName) continue;
        if (csvCol === reverseMap.email) continue;
        if (csvCol === reverseMap.phone) continue;
        if (csvCol === reverseMap.department) continue;
        if (value?.trim()) responseSummary[csvCol] = value.trim();
      }

      // Check duplicate: aynı form + aynı email + aynı responseSummary → duplicate
      // Aynı form + aynı email + farklı cevaplar → kabul
      const existingApps = await prisma.application.findMany({
        where: { email, formConfigId },
      });
      if (existingApps.length > 0) {
        const newSummaryHash = JSON.stringify(
          Object.entries(responseSummary).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        );
        const isDuplicate = existingApps.some((ex) => {
          const exSummary =
            (ex.responseSummary as Record<string, string>) || {};
          const exHash = JSON.stringify(
            Object.entries(exSummary).sort(([a], [b]) => a.localeCompare(b)),
          );
          return newSummaryHash === exHash;
        });
        if (isDuplicate) {
          errors.push({
            row: excelRow,
            reason: `Mükerrer başvuru (aynı cevaplar): ${email}`,
          });
          skippedCount++;
          continue;
        }
      }

      // Generate application number
      const appNo = `MR-IMP-${Date.now()}-${i}`;

      await prisma.application.create({
        data: {
          applicationNo: appNo,
          formConfigId,
          departmentId,
          fullName,
          email,
          phone,
          status: "new",
          responseSummary: JSON.parse(JSON.stringify(responseSummary)),
          importLogId: importLog.id,
        },
      });

      importedCount++;
    } catch (err) {
      errors.push({ row: excelRow, reason: String(err) });
      skippedCount++;
    }
  }

  // Update import log
  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      importedCount,
      skippedCount,
      errorDetails:
        errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
      status: "completed",
      completedAt: new Date(),
    },
  });

  return {
    importLogId: importLog.id.toString(),
    totalRows: rows.length,
    importedCount,
    skippedCount,
    errors,
  };
}
