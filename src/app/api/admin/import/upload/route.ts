import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/utils";
import {
  parseCSV,
  parseXLSX,
  autoMapColumns,
  importApplications,
  preValidateRows,
} from "@/services/import.service";
import type { RowDecision } from "@/services/import.service";

// POST /api/admin/import/upload — Dosya yükle, doğrula ve aktarım başlat
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const columnMappingStr = formData.get("columnMapping") as string | null;
    const headerRowIndexStr = formData.get("headerRowIndex") as string | null;
    const mode = formData.get("mode") as string | null; // "validate" | "import" | null
    const rowDecisionsStr = formData.get("rowDecisions") as string | null;

    if (!file) return apiError("Dosya yüklenmedi.");

    const fileName = file.name.toLowerCase();
    let headers: string[];
    let rows: Record<string, string>[];
    let headerRowIndex: number;

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const parsed = parseCSV(text);
      headers = parsed.headers;
      rows = parsed.rows;
      headerRowIndex = parsed.headerRowIndex;
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const buffer = await file.arrayBuffer();
      const parsed = parseXLSX(buffer);
      headers = parsed.headers;
      rows = parsed.rows;
      headerRowIndex = parsed.headerRowIndex;
    } else {
      return apiError("Desteklenmeyen dosya formatı. CSV veya XLSX yükleyin.");
    }

    if (rows.length === 0) return apiError("Dosyada veri bulunamadı.");

    // If only preview requested (no columnMapping), return headers + auto mapping + sample
    if (!columnMappingStr) {
      const autoMapping = autoMapColumns(headers);
      return Response.json({
        success: true,
        data: {
          headers,
          autoMapping,
          sampleRows: rows.slice(0, 5),
          totalRows: rows.length,
          headerRowIndex,
        },
      });
    }

    const columnMapping = JSON.parse(columnMappingStr) as Record<
      string,
      string
    >;
    const actualHeaderRowIndex = headerRowIndexStr
      ? parseInt(headerRowIndexStr, 10)
      : headerRowIndex;

    // ─── Validate Mode: Pre-validate rows without importing ───
    if (mode === "validate") {
      const validation = preValidateRows(
        rows,
        columnMapping,
        actualHeaderRowIndex,
      );

      const serialized = JSON.parse(
        JSON.stringify(validation, (_k, v) =>
          typeof v === "bigint" ? v.toString() : v,
        ),
      );

      return Response.json({ success: true, data: serialized });
    }

    // ─── Import Mode: Import with optional row decisions ───
    // Get or create a default form config for imports
    let formConfig = await prisma.formConfig.findFirst({
      where: { title: "Import Form" },
    });
    if (!formConfig) {
      formConfig = await prisma.formConfig.create({
        data: {
          title: "Import Form",
          mode: "static",
          isPublished: false,
          isActive: false,
        },
      });
    }

    // Parse row decisions if provided
    let rowDecisions: RowDecision[] | undefined;
    if (rowDecisionsStr) {
      rowDecisions = JSON.parse(rowDecisionsStr) as RowDecision[];
    }

    const result = await importApplications(
      rows,
      columnMapping,
      file.name,
      formConfig.id,
      actualHeaderRowIndex,
      rowDecisions,
    );

    const serialized = JSON.parse(
      JSON.stringify(result, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );

    return Response.json({ success: true, data: serialized });
  } catch (err) {
    console.error("Import error:", err);
    return apiError("Veri aktarımı başarısız.", 500);
  }
}
