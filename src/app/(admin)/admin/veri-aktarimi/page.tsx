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

const SYSTEM_FIELDS = [
  { value: "fullName", label: "Ad Soyad" },
  { value: "email", label: "E-posta" },
  { value: "phone", label: "Telefon" },
  { value: "department", label: "Departman" },
  { value: "submittedAt", label: "Başvuru Tarihi" },
  { value: "status", label: "Durum" },
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

type Step = "upload" | "mapping" | "result";

export default function DataImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  // Import logs
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/import/logs");
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setHeaders(json.data.headers);
        setAutoMapping(json.data.autoMapping);
        setColumnMapping(json.data.autoMapping);
        setSampleRows(json.data.sampleRows);
        setTotalRows(json.data.totalRows);
        setHeaderRowIndex(json.data.headerRowIndex ?? 0);
        setStep("mapping");
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      formData.append("headerRowIndex", String(headerRowIndex));

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
    } catch (err) {
      console.error(err);
    }
    setImporting(false);
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
  };

  // Count mapped fields
  const mappedCount = Object.values(columnMapping).filter(
    (v) => v && v !== "_skip",
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
              {uploading ? "Analiz ediliyor..." : "Dosyayı Analiz Et"}
            </Button>
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
                {mappedCount > 0 && (
                  <span className="text-mr-navy font-medium">
                    {" "}
                    {mappedCount} sütun eşleştirildi.
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
                      <SelectTrigger className="w-[160px]">
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
                            className="text-xs max-w-[200px] truncate"
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
              {importing ? "Aktarılıyor..." : `${totalRows} Satırı Aktar`}
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
