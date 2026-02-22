"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const SYSTEM_FIELDS = [
  { value: "fullName", label: "Ad Soyad" },
  { value: "email", label: "E-posta" },
  { value: "phone", label: "Telefon" },
  { value: "department", label: "Departman" },
  { value: "submittedAt", label: "Başvuru Tarihi" },
  { value: "status", label: "Durum" },
  { value: "_dynamic", label: "📋 Dinamik Alan (Otomatik Kaydet)" },
  { value: "_skip", label: "— Atla —" },
];

interface ImportLog {
  id: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errorDetails: { row: number; reason: string }[] | null;
  status: string;
  createdAt: string;
}

// Pre-validation types (server'dan gelen)
interface FieldIssue {
  field: string;
  fieldLabel: string;
  currentValue: string;
  reason: string;
}

interface RowValidationIssue {
  row: number;
  rowIndex: number;
  rowData: Record<string, string>;
  issues: FieldIssue[];
}

interface ReviewDecision {
  action: "import_empty" | "skip" | "fix";
  fixes?: Record<string, string>;
}

type Step = "upload" | "mapping" | "review" | "result";

export default function DataImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  // Preview data
  const [headers, setHeaders] = useState<string[]>([]);
  const [autoMapping, setAutoMapping] = useState<Record<string, string>>({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);

  // Result
  const [result, setResult] = useState<{
    importedCount: number;
    skippedCount: number;
    errors: { row: number; reason: string }[];
  } | null>(null);

  // Review step (problematic rows)
  const [problemRows, setProblemRows] = useState<RowValidationIssue[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [reviewDecisions, setReviewDecisions] = useState<Record<number, ReviewDecision>>({});

  // Import logs
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/import/logs");
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch {
      toast.error("Aktarım geçmişi yüklenemedi");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void fetchLogs();
  }, [fetchLogs]);

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploadProgress(100);
      try {
        const json = JSON.parse(xhr.responseText);
        if (json.success) {
          setHeaders(json.data.headers);
          setAutoMapping(json.data.autoMapping);
          // Sistem alanına eşleşmemiş sütunları otomatik "dinamik alan" yap
          const enrichedMapping: Record<string, string> = {};
          for (const h of json.data.headers as string[]) {
            if (json.data.autoMapping[h]) {
              enrichedMapping[h] = json.data.autoMapping[h];
            } else {
              enrichedMapping[h] = "_dynamic"; // Otomatik dinamik alan
            }
          }
          setColumnMapping(enrichedMapping);
          setSampleRows(json.data.sampleRows);
          setTotalRows(json.data.totalRows);
          setHeaderRowIndex(json.data.headerRowIndex ?? 0);
          setStep("mapping");
        } else {
          toast.error("Dosya analiz edilemedi", {
            description: "Desteklenen formatlar: .csv, .xlsx, .xls",
          });
        }
      } catch {
        toast.error("Sunucu yanıtı okunamadı");
      }
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.onerror = () => {
      toast.error("Dosya analiz edilemedi", {
        description: "Bağlantı hatası. Lütfen tekrar deneyin.",
      });
      setUploading(false);
      setUploadProgress(0);
    };

    xhr.open("POST", "/api/admin/import/upload");
    xhr.send(formData);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      // Phase 1: Pre-validate
      const validateForm = new FormData();
      validateForm.append("file", file);
      validateForm.append("columnMapping", JSON.stringify(columnMapping));
      validateForm.append("headerRowIndex", String(headerRowIndex));
      validateForm.append("mode", "validate");

      const valRes = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: validateForm,
      });
      const valJson = await valRes.json();

      if (valJson.success && valJson.data.problemRows.length > 0) {
        // There are problematic rows → show review step
        setProblemRows(valJson.data.problemRows);
        setValidCount(valJson.data.validCount);
        // Default all decisions to "skip"
        const defaults: Record<number, ReviewDecision> = {};
        for (const pr of valJson.data.problemRows) {
          defaults[pr.row] = { action: "skip" };
        }
        setReviewDecisions(defaults);
        setStep("review");
        setImporting(false);
        return;
      }

      // No problems → proceed directly to import
      await executeImport();
    } catch {
      toast.error("Veri aktarımı başarısız", {
        description: "Lütfen dosyayı ve eşleştirmeleri kontrol ederek tekrar deneyin.",
      });
    }
    setImporting(false);
  };

  const executeImport = async (decisions?: Record<number, ReviewDecision>) => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      formData.append("headerRowIndex", String(headerRowIndex));
      formData.append("mode", "import");

      // Convert decisions to RowDecision array for server
      if (decisions && Object.keys(decisions).length > 0) {
        const rowDecisions = Object.entries(decisions).map(([rowStr, dec]) => ({
          row: Number(rowStr),
          action: dec.action,
          fixes: dec.fixes,
        }));
        formData.append("rowDecisions", JSON.stringify(rowDecisions));
      }

      const res = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        setStep("result");
        fetchLogs();
      }
    } catch {
      toast.error("Veri aktarımı başarısız", {
        description: "Lütfen dosyayı ve eşleştirmeleri kontrol ederek tekrar deneyin.",
      });
    }
    setImporting(false);
  };

  const handleImportWithDecisions = () => {
    executeImport(reviewDecisions);
  };

  const updateDecision = (row: number, decision: ReviewDecision) => {
    setReviewDecisions((prev) => ({ ...prev, [row]: decision }));
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setAutoMapping({});
    setColumnMapping({});
    setSampleRows([]);
    setResult(null);
    setHeaderRowIndex(0);
    setUploadProgress(0);
    setProblemRows([]);
    setValidCount(0);
    setReviewDecisions({});
  };

  // Count mapped fields
  const mappedCount = Object.values(columnMapping).filter(
    (v) => v && v !== "_skip",
  ).length;
  const dynamicCount = Object.values(columnMapping).filter(
    (v) => v === "_dynamic",
  ).length;
  const hasRequired =
    Object.values(columnMapping).includes("fullName") &&
    Object.values(columnMapping).includes("email");

  return (
    <div className="space-y-6" role="main" aria-label="Veri aktarımı sayfası">
      <h1 className="text-2xl font-heading text-mr-navy">Veri Aktarımı</h1>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-mr-text-secondary">
              Dosya Yükle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-mr-text-muted">
              CSV veya XLSX dosyası yükleyerek toplu başvuru aktarımı
              yapabilirsiniz. Sütun başlığı satırı otomatik tespit edilir.
            </p>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              aria-label="CSV veya XLSX dosyası seçin"
            />
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-mr-navy hover:bg-mr-navy-light"
              aria-busy={uploading}
            >
              {uploading ? `Yükleniyor... %${uploadProgress}` : "Dosyayı Analiz Et"}
            </Button>
            {uploading && (
              <div
                className="w-full rounded-full bg-gray-100 h-2 overflow-hidden"
                title="Yükleme ilerleme çubuğu"
              >
                <div
                  className="h-2 rounded-full bg-mr-gold transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                  aria-label={`${uploadProgress}%`}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Column Mapping */}
      {step === "mapping" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-mr-text-secondary flex items-center justify-between">
                <span>Sütun Eşleştirme ({totalRows} veri satırı)</span>
                {headerRowIndex > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Başlık satırı: {headerRowIndex + 1}. satır (otomatik tespit)
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-mr-text-muted">
                Dosyadaki sütunları sistem alanlarıyla eşleştirin.
                Eşleşmeyen sütunlar <strong>dinamik alan</strong> olarak otomatik kaydedilir.
                {mappedCount > 0 && (
                  <span className="text-mr-navy font-medium">
                    {" "}
                    {mappedCount} sütun eşleştirildi.
                  </span>
                )}
                {dynamicCount > 0 && (
                  <span className="text-mr-gold font-medium">
                    {" "}
                    {dynamicCount} dinamik alan.
                  </span>
                )}
                {!hasRequired && (
                  <span className="text-mr-error font-medium">
                    {" "}
                    Ad Soyad ve E-posta zorunludur.
                  </span>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-2">
                    <span
                      className="text-sm w-48 truncate font-medium"
                      title={h}
                    >
                      {h}
                    </span>
                    <span className="text-mr-text-muted">→</span>
                    <Select
                      value={columnMapping[h] || "_skip"}
                      onValueChange={(v) =>
                        setColumnMapping((prev) => ({ ...prev, [h]: v }))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYSTEM_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {autoMapping[h] && (
                      <Badge variant="secondary" className="text-xs">
                        Otomatik
                      </Badge>
                    )}
                    {!autoMapping[h] && columnMapping[h] === "_dynamic" && (
                      <Badge variant="outline" className="text-xs text-mr-gold border-mr-gold">
                        Dinamik
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Preview */}
          {sampleRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-mr-text-secondary">
                  Önizleme (ilk 5 satır)
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (
                        <TableHead
                          key={h}
                          className="text-xs whitespace-nowrap"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleRows.map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell
                            key={h}
                            className="text-xs max-w-50 truncate"
                          >
                            {String(row[h] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Geri
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !hasRequired}
              className="bg-mr-gold hover:bg-mr-gold-dark text-white"
              aria-busy={importing}
            >
              {importing ? "Doğrulanıyor..." : `${totalRows} Satırı Aktar`}
            </Button>
          </div>
        </>
      )}

      {/* Step: Review - Hatalı satırları incele */}
      {step === "review" && problemRows.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-mr-text-secondary">
                Hatalı Satırlar ({problemRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-mr-success" />
                  <span><strong>{validCount}</strong> satır sorunsuz aktarılacak</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-mr-warning" />
                  <span><strong>{problemRows.length}</strong> satırda sorun tespit edildi</span>
                </div>
              </div>

              <p className="text-sm text-mr-text-muted">
                Her satır için aşağıdaki seçeneklerden birini seçin:
              </p>

              {/* Toplu işlem butonları */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updated: Record<number, ReviewDecision> = {};
                    for (const pr of problemRows) updated[pr.row] = { action: "skip" };
                    setReviewDecisions(updated);
                  }}
                >
                  Tümünü Atla
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const updated: Record<number, ReviewDecision> = {};
                    for (const pr of problemRows) updated[pr.row] = { action: "import_empty" };
                    setReviewDecisions(updated);
                  }}
                >
                  Tümünü Boş Olarak Aktar
                </Button>
              </div>

              {/* Satır listesi */}
              <div className="max-h-125 overflow-y-auto space-y-3">
                {problemRows.map((pr) => {
                  const dec = reviewDecisions[pr.row] || { action: "skip" };
                  return (
                    <div
                      key={pr.row}
                      className="border rounded-lg p-4 space-y-3 bg-white"
                    >
                      {/* Satır başlığı */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            Satır {pr.row}
                          </Badge>
                          {pr.rowData[Object.keys(pr.rowData)[0]] && (
                            <span className="text-sm text-mr-text-secondary truncate max-w-64">
                              {pr.rowData[Object.keys(pr.rowData)[0]]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sorunlu alanlar */}
                      {pr.issues.map((issue) => (
                        <div key={issue.field} className="bg-red-50 rounded p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="destructive" className="text-xs">
                              {issue.fieldLabel}
                            </Badge>
                            <span className="text-mr-text-muted">{issue.reason}</span>
                            {issue.currentValue && (
                              <code className="bg-red-100 px-2 py-0.5 rounded text-xs text-red-700 max-w-48 truncate inline-block">
                                {issue.currentValue}
                              </code>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Karar butonları */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={dec.action === "skip" ? "default" : "outline"}
                          onClick={() => updateDecision(pr.row, { action: "skip" })}
                          className={dec.action === "skip" ? "bg-mr-navy hover:bg-mr-navy-light" : ""}
                        >
                          Satırı Atla
                        </Button>
                        <Button
                          size="sm"
                          variant={dec.action === "import_empty" ? "default" : "outline"}
                          onClick={() => updateDecision(pr.row, { action: "import_empty" })}
                          className={dec.action === "import_empty" ? "bg-mr-gold hover:bg-mr-gold-dark text-white" : ""}
                        >
                          Boş Olarak Aktar
                        </Button>
                        <Button
                          size="sm"
                          variant={dec.action === "fix" ? "default" : "outline"}
                          onClick={() =>
                            updateDecision(pr.row, {
                              action: "fix",
                              fixes: dec.fixes || Object.fromEntries(
                                pr.issues.map((iss) => [iss.field, iss.currentValue])
                              ),
                            })
                          }
                          className={dec.action === "fix" ? "bg-mr-success hover:bg-mr-success/90 text-white" : ""}
                        >
                          Düzelt
                        </Button>

                        {/* Düzelt seçilmişse input alanları */}
                        {dec.action === "fix" && (
                          <div className="flex flex-wrap gap-2 ml-2">
                            {pr.issues.map((issue) => (
                              <div key={issue.field} className="flex items-center gap-1">
                                <span className="text-xs text-mr-text-muted">{issue.fieldLabel}:</span>
                                <Input
                                  className="w-52 h-8 text-sm"
                                  placeholder={`Doğru ${issue.fieldLabel.toLowerCase()} girin`}
                                  value={dec.fixes?.[issue.field] ?? issue.currentValue}
                                  onChange={(e) => {
                                    const newFixes = { ...(dec.fixes || {}), [issue.field]: e.target.value };
                                    updateDecision(pr.row, { action: "fix", fixes: newFixes });
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Geri
            </Button>
            <Button
              onClick={handleImportWithDecisions}
              disabled={importing}
              className="bg-mr-gold hover:bg-mr-gold-dark text-white"
              aria-busy={importing}
            >
              {importing
                ? "Aktarılıyor..."
                : `Seçimleri Uygula ve Aktar (${validCount + Object.values(reviewDecisions).filter((d) => d.action !== "skip").length} satır)`}
            </Button>
          </div>
        </>
      )}

      {/* Step: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-mr-text-secondary">
              Aktarım Sonucu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-mr-success">
                  {result.importedCount}
                </p>
                <p className="text-xs text-mr-text-muted">Başarılı</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-mr-warning">
                  {result.skippedCount}
                </p>
                <p className="text-xs text-mr-text-muted">Atlanan</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-mr-navy">
                  {result.importedCount + result.skippedCount}
                </p>
                <p className="text-xs text-mr-text-muted">Toplam</p>
              </div>
            </div>

            {/* Atlanan kayıtların detaylı nedenleri */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-mr-navy">
                  Atlanan Kayıtlar ({result.errors.length})
                </h3>

                {/* Neden bazlı özet */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(() => {
                    const reasons: Record<string, number> = {};
                    result.errors.forEach((e) => {
                      const key = e.reason.startsWith("Mükerrer")
                        ? "Mükerrer başvuru"
                        : e.reason.startsWith("Ad veya")
                          ? "Ad/E-posta eksik"
                          : e.reason.startsWith("Geçersiz")
                            ? "Geçersiz e-posta"
                            : "Diğer hata";
                      reasons[key] = (reasons[key] || 0) + 1;
                    });
                    return Object.entries(reasons).map(([reason, count]) => (
                      <Badge key={reason} variant="outline" className="text-xs">
                        {reason}: {count}
                      </Badge>
                    ));
                  })()}
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-20">Satır No</TableHead>
                        <TableHead className="text-xs">Neden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">
                            {e.row}
                          </TableCell>
                          <TableCell className="text-xs">{e.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button
              onClick={reset}
              className="bg-mr-navy hover:bg-mr-navy-light"
            >
              Yeni Aktarım
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-mr-text-secondary">
            Aktarım Geçmişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-mr-text-muted">
              Henüz aktarım yapılmamış.
            </p>
          ) : (
            <div className="space-y-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Dosya</TableHead>
                    <TableHead className="text-xs text-center">
                      Toplam
                    </TableHead>
                    <TableHead className="text-xs text-center">
                      Başarılı
                    </TableHead>
                    <TableHead className="text-xs text-center">
                      Atlanan
                    </TableHead>
                    <TableHead className="text-xs text-center">Durum</TableHead>
                    <TableHead className="text-xs">Tarih</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-mr-bg-subtle"
                        onClick={() =>
                          setExpandedLog(expandedLog === log.id ? null : log.id)
                        }
                      >
                        <TableCell className="text-xs font-medium">
                          {log.fileName}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {log.totalRows}
                        </TableCell>
                        <TableCell className="text-xs text-center text-mr-success">
                          {log.importedCount}
                        </TableCell>
                        <TableCell className="text-xs text-center text-mr-warning">
                          {log.skippedCount}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge
                            variant={
                              log.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {log.status === "completed"
                              ? "Tamamlandı"
                              : log.status === "processing"
                                ? "İşleniyor"
                                : log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-mr-text-muted">
                          {new Date(log.createdAt).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.errorDetails && log.errorDetails.length > 0 && (
                            <span className="text-mr-text-muted">
                              {expandedLog === log.id ? "▲" : "▼"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedLog === log.id &&
                        log.errorDetails &&
                        log.errorDetails.length > 0 && (
                          <TableRow key={`${log.id}-details`}>
                            <TableCell
                              colSpan={7}
                              className="bg-mr-bg-subtle p-0"
                            >
                              <div className="p-3 space-y-2">
                                <p className="text-xs font-medium text-mr-navy">
                                  Atlanan Kayıt Detayları (
                                  {log.errorDetails.length})
                                </p>
                                <div className="max-h-48 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs w-20">
                                          Satır
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Neden
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {log.errorDetails.map((err, i) => (
                                        <TableRow key={i}>
                                          <TableCell className="text-xs font-mono">
                                            {err.row}
                                          </TableCell>
                                          <TableCell className="text-xs">
                                            {err.reason}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
