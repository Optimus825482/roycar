// ─── Değerlendirme Sonuçları Export Utility ───
// PDF (HTML-based print-to-PDF), Excel (xlsx), Print

// xlsx is dynamically imported to avoid ~300KB client bundle bloat

/* ─── Types ─── */

export interface EvalExportData {
  candidateName: string;
  email: string;
  phone: string;
  department: string;
  positionTitle?: string;
  applicationNo: string;
  submittedAt: string;
  status: string;
  overallScore: number;
  evaluatedAt: string | null;
  report: {
    overallScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    fitAnalysis: string;
    recommendation: string;
    recommendationReason: string;
    dimensionScores?: Record<string, number>;
    customCriteriaResults?: { criterion: string; met: boolean; note: string }[];
  } | null;
}

const SYSTEM_TITLE = "F&B Kariyer Değerlendirme Sistemi";

const STATUS_TR: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const REC_TR: Record<string, string> = {
  shortlist: "Kısa Liste",
  interview: "Mülakata Çağır",
  consider: "Değerlendir",
  reject: "Uygun Değil",
  hire: "İşe Al",
};

const DIMENSION_TR: Record<string, string> = {
  education: "Eğitim",
  experience: "Deneyim",
  positionFit: "Pozisyon Uyumu",
  personality: "Kişilik",
  industryFit: "Sektör Uyumu",
  riskFactors: "Risk Faktörleri",
};

function formatDateTR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
/* ═══════════════════════════════════════════════════════════════
   Shared HTML Builder — Tablo bazlı, Türkçe destekli
   ═══════════════════════════════════════════════════════════════ */

function buildReportHTML(data: EvalExportData): string {
  const recLabel = data.report?.recommendation
    ? REC_TR[data.report.recommendation] || data.report.recommendation
    : "—";

  const scoreColor =
    data.overallScore >= 70
      ? "#10b981"
      : data.overallScore >= 40
        ? "#f59e0b"
        : "#ef4444";

  const recBg =
    data.report?.recommendation === "shortlist"
      ? "#ecfdf5"
      : data.report?.recommendation === "interview"
        ? "#eff6ff"
        : data.report?.recommendation === "consider"
          ? "#fffbeb"
          : "#fef2f2";

  const recColor =
    data.report?.recommendation === "shortlist"
      ? "#065f46"
      : data.report?.recommendation === "interview"
        ? "#1e40af"
        : data.report?.recommendation === "consider"
          ? "#92400e"
          : "#991b1b";

  // Dimension scores table rows
  let dimensionRows = "";
  if (data.report?.dimensionScores) {
    dimensionRows = Object.entries(data.report.dimensionScores)
      .map(
        ([key, val]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:500">${escapeHtml(DIMENSION_TR[key] || key)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:${val >= 70 ? "#059669" : val >= 40 ? "#d97706" : "#dc2626"}">${val}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">
            <div style="background:#e2e8f0;border-radius:4px;height:16px;width:100%;overflow:hidden">
              <div style="background:${val >= 70 ? "#10b981" : val >= 40 ? "#f59e0b" : "#ef4444"};height:16px;border-radius:4px;width:${val}%;transition:width 0.3s"></div>
            </div>
          </td>
        </tr>`,
      )
      .join("");
  }

  // Strengths list
  const strengthsList = data.report?.strengths?.length
    ? data.report.strengths
        .map((s) => `<li style="margin-bottom:4px">${escapeHtml(s)}</li>`)
        .join("")
    : "";

  // Weaknesses list
  const weaknessesList = data.report?.weaknesses?.length
    ? data.report.weaknesses
        .map((w) => `<li style="margin-bottom:4px">${escapeHtml(w)}</li>`)
        .join("")
    : "";

  // Custom criteria rows
  let criteriaRows = "";
  if (data.report?.customCriteriaResults?.length) {
    criteriaRows = data.report.customCriteriaResults
      .map(
        (c) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(c.criterion)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:600;color:${c.met ? "#059669" : "#dc2626"}">${c.met ? "Evet" : "Hayır"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b">${escapeHtml(c.note || "—")}</td>
        </tr>`,
      )
      .join("");
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Değerlendirme — ${escapeHtml(data.candidateName)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-break { page-break-inside: avoid; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #334155; font-size: 12px; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; }
  </style>
</head>
<body>

<!-- ═══ HEADER ═══ -->
<div style="background:#0f172a;padding:16px 24px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="color:#d4af37;font-size:18px;font-weight:700;letter-spacing:0.5px">${SYSTEM_TITLE}</div>
    <div style="color:rgba(255,255,255,0.6);font-size:10px;margin-top:2px">Aday Değerlendirme Raporu</div>
  </div>
  <div style="text-align:right;color:rgba(255,255,255,0.7);font-size:10px">
    <div>Rapor: ${new Date().toLocaleDateString("tr-TR")}</div>
    <div>Değerlendirme: ${formatDateTR(data.evaluatedAt)}</div>
  </div>
</div>
<div style="height:3px;background:linear-gradient(90deg,#d4af37,#b8941e)"></div>

<div style="padding:20px 24px">

<!-- ═══ ADAY BİLGİLERİ TABLOSU ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#f1f5f9">
        <th colspan="4" style="padding:10px 12px;font-size:14px;color:#0f172a;border-bottom:2px solid #d4af37">
          ${escapeHtml(data.candidateName)}
          <span style="font-weight:400;font-size:11px;color:#64748b;margin-left:8px">#${escapeHtml(data.applicationNo)}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px 12px;width:120px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9">E-posta</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${escapeHtml(data.email)}</td>
        <td style="padding:6px 12px;width:120px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9">Telefon</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${escapeHtml(data.phone)}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9">Departman</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${escapeHtml(data.department)}</td>
        <td style="padding:6px 12px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9">Pozisyon</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${escapeHtml(data.positionTitle || "—")}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-weight:600;color:#475569">Başvuru Tarihi</td>
        <td style="padding:6px 12px">${formatDateTR(data.submittedAt)}</td>
        <td style="padding:6px 12px;font-weight:600;color:#475569">Durum</td>
        <td style="padding:6px 12px">${STATUS_TR[data.status] || data.status}</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ═══ PUAN & ÖNERİ TABLOSU ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 12px;color:#d4af37;font-size:12px" colspan="2">Değerlendirme Sonucu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:12px;text-align:center;width:120px;vertical-align:middle">
          <div style="width:64px;height:64px;border-radius:50%;background:${scoreColor};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;line-height:1">
            ${data.overallScore}
          </div>
          <div style="font-size:10px;color:#64748b;margin-top:4px">/100 Puan</div>
        </td>
        <td style="padding:12px;vertical-align:top">
          <div style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;background:${recBg};color:${recColor};margin-bottom:8px">
            ${escapeHtml(recLabel)}
          </div>
          ${data.report?.summary ? `<div style="font-size:11px;color:#475569;line-height:1.6">${escapeHtml(data.report.summary)}</div>` : ""}
        </td>
      </tr>
    </tbody>
  </table>
</div>

${
  dimensionRows
    ? `
<!-- ═══ BOYUT PUANLARI TABLOSU ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 12px;color:#fff;font-size:11px">Boyut</th>
        <th style="padding:8px 12px;color:#fff;font-size:11px;text-align:center;width:60px">Puan</th>
        <th style="padding:8px 12px;color:#fff;font-size:11px;width:40%">Seviye</th>
      </tr>
    </thead>
    <tbody>${dimensionRows}</tbody>
  </table>
</div>`
    : ""
}

${
  strengthsList || weaknessesList
    ? `
<!-- ═══ GÜÇLÜ & ZAYIF YÖNLER TABLOSU ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        ${strengthsList ? '<th style="padding:8px 12px;color:#10b981;font-size:11px;width:50%">Güçlü Yönler</th>' : ""}
        ${weaknessesList ? '<th style="padding:8px 12px;color:#f87171;font-size:11px;width:50%">Zayıf Yönler</th>' : ""}
      </tr>
    </thead>
    <tbody>
      <tr>
        ${
          strengthsList
            ? `<td style="padding:10px 12px;vertical-align:top;background:#f0fdf4">
            <ul style="margin:0;padding-left:16px;font-size:11px;color:#065f46;list-style:disc">${strengthsList}</ul>
          </td>`
            : ""
        }
        ${
          weaknessesList
            ? `<td style="padding:10px 12px;vertical-align:top;background:#fef2f2">
            <ul style="margin:0;padding-left:16px;font-size:11px;color:#991b1b;list-style:disc">${weaknessesList}</ul>
          </td>`
            : ""
        }
      </tr>
    </tbody>
  </table>
</div>`
    : ""
}

${
  data.report?.fitAnalysis
    ? `
<!-- ═══ POZİSYON UYUMU ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 12px;color:#d4af37;font-size:11px">Pozisyon Uyum Analizi</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:12px;font-size:11px;color:#475569;line-height:1.6">${escapeHtml(data.report.fitAnalysis)}</td></tr>
    </tbody>
  </table>
</div>`
    : ""
}

${
  data.report?.recommendationReason
    ? `
<!-- ═══ ÖNERİ GEREKÇESİ ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 12px;color:#d4af37;font-size:11px">Öneri Gerekçesi</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:12px;font-size:11px;color:#475569;line-height:1.6;font-style:italic">${escapeHtml(data.report.recommendationReason)}</td></tr>
    </tbody>
  </table>
</div>`
    : ""
}

${
  criteriaRows
    ? `
<!-- ═══ ÖZEL KRİTERLER ═══ -->
<div class="no-break">
  <table style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 12px;color:#fff;font-size:11px">Kriter</th>
        <th style="padding:8px 12px;color:#fff;font-size:11px;text-align:center;width:80px">Durum</th>
        <th style="padding:8px 12px;color:#fff;font-size:11px">Not</th>
      </tr>
    </thead>
    <tbody>${criteriaRows}</tbody>
  </table>
</div>`
    : ""
}

</div>

<!-- ═══ FOOTER ═══ -->
<div style="position:fixed;bottom:0;left:0;right:0;border-top:2px solid #d4af37;padding:8px 24px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;background:#fff">
  <span>${SYSTEM_TITLE}</span>
  <span>Gizli Belge — ${new Date().toLocaleDateString("tr-TR")}</span>
</div>

</body>
</html>`;
}
/* ═══════════════════════════════════════════════════════════════
   PDF EXPORT — HTML tabanlı, Türkçe karakter destekli
   ═══════════════════════════════════════════════════════════════ */

export async function exportToPDF(data: EvalExportData): Promise<void> {
  const html = buildReportHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup engelleyici aktif. Lütfen izin verin.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

/* ═══════════════════════════════════════════════════════════════
   EXCEL EXPORT — Tablo bazlı
   ═══════════════════════════════════════════════════════════════ */

export async function exportToExcel(data: EvalExportData): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const recLabel = data.report?.recommendation
    ? REC_TR[data.report.recommendation] || data.report.recommendation
    : "—";

  // ─── Sheet 1: Genel Bilgiler ───
  const generalData = [
    [SYSTEM_TITLE],
    ["Aday Değerlendirme Raporu"],
    [],
    ["Alan", "Değer"],
    ["Ad Soyad", data.candidateName],
    ["E-posta", data.email],
    ["Telefon", data.phone],
    ["Departman", data.department],
    ["Pozisyon", data.positionTitle || "—"],
    ["Başvuru No", data.applicationNo],
    ["Başvuru Tarihi", formatDateTR(data.submittedAt)],
    ["Durum", STATUS_TR[data.status] || data.status],
    [],
    ["Genel Puan", data.overallScore],
    ["Öneri", recLabel],
    ["Değerlendirme Tarihi", formatDateTR(data.evaluatedAt)],
    [],
    ["Özet"],
    [data.report?.summary || "—"],
    [],
    ["Pozisyon Uyumu"],
    [data.report?.fitAnalysis || "—"],
    [],
    ["Öneri Gerekçesi"],
    [data.report?.recommendationReason || "—"],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(generalData);
  ws1["!cols"] = [{ wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Genel Bilgiler");

  // ─── Sheet 2: Boyut Puanları ───
  if (data.report?.dimensionScores) {
    const dimData = [
      ["Boyut", "Puan"],
      ...Object.entries(data.report.dimensionScores).map(([key, val]) => [
        DIMENSION_TR[key] || key,
        val,
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(dimData);
    ws2["!cols"] = [{ wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Boyut Puanları");
  }

  // ─── Sheet 3: Güçlü & Zayıf Yönler ───
  if (data.report?.strengths?.length || data.report?.weaknesses?.length) {
    const maxLen = Math.max(
      data.report?.strengths?.length || 0,
      data.report?.weaknesses?.length || 0,
    );
    const swData: string[][] = [["Güçlü Yönler", "Zayıf Yönler"]];
    for (let i = 0; i < maxLen; i++) {
      swData.push([
        data.report?.strengths?.[i] || "",
        data.report?.weaknesses?.[i] || "",
      ]);
    }
    const ws3 = XLSX.utils.aoa_to_sheet(swData);
    ws3["!cols"] = [{ wch: 50 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Güçlü-Zayıf Yönler");
  }

  // ─── Sheet 4: Özel Kriterler ───
  if (data.report?.customCriteriaResults?.length) {
    const critData = [
      ["Kriter", "Durum", "Not"],
      ...data.report.customCriteriaResults.map((c) => [
        c.criterion,
        c.met ? "Evet" : "Hayır",
        c.note || "—",
      ]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(critData);
    ws4["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Özel Kriterler");
  }

  const fileName = `Degerlendirme_${data.candidateName.replace(/\s+/g, "_")}_${data.applicationNo}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/* ═══════════════════════════════════════════════════════════════
   PRINT — Aynı HTML şablonu kullanır
   ═══════════════════════════════════════════════════════════════ */

export function printEvaluation(data: EvalExportData): void {
  const html = buildReportHTML(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup engelleyici aktif. Lütfen izin verin.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

/* ═══════════════════════════════════════════════════════════════
   LIST EXPORT — Tüm adaylar tek tablo halinde
   ═══════════════════════════════════════════════════════════════ */

export interface ListExportItem {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  positionTitle: string;
  overallScore: number;
  recommendation: string | null;
  finalDecision: string | null;
  manualNote: string | null;
}

const DECISION_TR: Record<string, string> = {
  hired: "İşe Alındı",
  interview: "Mülakata Çağrıldı",
  pending: "Beklemede",
  rejected: "Reddedildi",
  reserve: "Yedek Liste",
};

function buildListHTML(items: ListExportItem[]): string {
  const rows = items
    .map(
      (item, i) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;color:#64748b">${i + 1}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:500">${escapeHtml(item.fullName)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px">${escapeHtml(item.email)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px">${escapeHtml(item.phone || "—")}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px">${escapeHtml(item.department)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px">${escapeHtml(item.positionTitle || "—")}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:${item.overallScore >= 70 ? "#059669" : item.overallScore >= 40 ? "#d97706" : "#dc2626"}">${item.overallScore}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px">${item.recommendation ? escapeHtml(REC_TR[item.recommendation] || item.recommendation) : "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:500">${item.finalDecision ? escapeHtml(DECISION_TR[item.finalDecision] || item.finalDecision) : "—"}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${SYSTEM_TITLE} — Aday Listesi</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #334155; font-size: 12px; line-height: 1.4; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>

<div style="background:#0f172a;padding:14px 20px;display:flex;justify-content:space-between;align-items:center">
  <div>
    <div style="color:#d4af37;font-size:16px;font-weight:700;letter-spacing:0.5px">${SYSTEM_TITLE}</div>
    <div style="color:rgba(255,255,255,0.6);font-size:10px;margin-top:2px">Aday Listesi — ${items.length} aday</div>
  </div>
  <div style="text-align:right;color:rgba(255,255,255,0.7);font-size:10px">
    <div>Tarih: ${new Date().toLocaleDateString("tr-TR")}</div>
  </div>
</div>
<div style="height:3px;background:linear-gradient(90deg,#d4af37,#b8941e)"></div>

<div style="padding:16px 20px">
  <table style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
    <thead>
      <tr style="background:#0f172a">
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:center;width:30px">#</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:left">Ad Soyad</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:left">E-posta</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:left">Telefon</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:left">Departman</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:left">Pozisyon</th>
        <th style="padding:8px 10px;color:#d4af37;font-size:10px;text-align:center;width:50px">Puan</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:center">AI Öneri</th>
        <th style="padding:8px 10px;color:#fff;font-size:10px;text-align:center">Nihai Karar</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>

<div style="position:fixed;bottom:0;left:0;right:0;border-top:2px solid #d4af37;padding:8px 20px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;background:#fff">
  <span>${SYSTEM_TITLE}</span>
  <span>Gizli Belge — ${new Date().toLocaleDateString("tr-TR")}</span>
</div>

</body>
</html>`;
}

export function exportListToPDF(items: ListExportItem[]): void {
  const html = buildListHTML(items);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup engelleyici aktif. Lütfen izin verin.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.print();
  };
}

export async function exportListToExcel(
  items: ListExportItem[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const data = [
    [SYSTEM_TITLE + " — Aday Listesi"],
    [
      `Tarih: ${new Date().toLocaleDateString("tr-TR")}`,
      `Toplam: ${items.length} aday`,
    ],
    [],
    [
      "#",
      "Ad Soyad",
      "E-posta",
      "Telefon",
      "Departman",
      "Pozisyon",
      "Puan",
      "AI Öneri",
      "Nihai Karar",
    ],
    ...items.map((item, i) => [
      i + 1,
      item.fullName,
      item.email,
      item.phone || "—",
      item.department,
      item.positionTitle || "—",
      item.overallScore,
      item.recommendation
        ? REC_TR[item.recommendation] || item.recommendation
        : "—",
      item.finalDecision
        ? DECISION_TR[item.finalDecision] || item.finalDecision
        : "—",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 8 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Aday Listesi");
  XLSX.writeFile(
    wb,
    `Aday_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function printListEvaluation(items: ListExportItem[]): void {
  const html = buildListHTML(items);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup engelleyici aktif. Lütfen izin verin.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    w.print();
  };
}
