"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplicationDetailModal } from "@/components/admin/ApplicationDetailModal";
import { AppTableSkeleton } from "@/components/shared/AppLoader";
import { EmptyState } from "@/components/shared/EmptyState";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportListToExcel } from "@/lib/export-utils";

/* ─────────── Types ─────────── */

interface Department {
  id: string;
  name: string;
}

interface ApplicationRow {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  submittedAt: string;
  department: { name: string } | null;
  positionTitle?: string | null;
  evaluation: {
    overallScore: number;
    status: string;
    report: unknown;
    evaluatedAt: string | null;
  } | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ─────────── Constants ─────────── */

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white border-blue-700",
  reviewed: "bg-amber-500 text-white border-amber-600",
  shortlisted: "bg-emerald-600 text-white border-emerald-700",
  rejected: "bg-red-600 text-white border-red-700",
  hired: "bg-green-600 text-white border-green-700",
};

const EVAL_STATUS_LABELS: Record<string, string> = {
  completed: "Tamamlandı",
  pending: "Bekliyor",
  failed: "Hata",
  not_evaluated: "Değerlendirilmedi",
};

const EVAL_STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold",
  pending: "bg-amber-100 text-amber-800 border-amber-300 font-semibold",
  failed: "bg-red-100 text-red-800 border-red-300 font-semibold",
  not_evaluated: "bg-slate-100 text-slate-600 border-slate-300",
};

/* ─────────── Helper Components ─────────── */

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null)
    return (
      <Badge variant="outline" className="text-slate-500 border-slate-300">
        —
      </Badge>
    );

  let colorClass = "bg-red-100 text-red-800 border-red-300 font-bold";
  if (score >= 70)
    colorClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  else if (score >= 40)
    colorClass = "bg-amber-100 text-amber-800 border-amber-300 font-bold";

  return (
    <Badge variant="outline" className={`font-bold text-sm ${colorClass}`}>
      {score}
    </Badge>
  );
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
        active
          ? "bg-mr-navy text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
      {active && (
        <span className="text-[10px]">{direction === "desc" ? "↓" : "↑"}</span>
      )}
    </button>
  );
}

/* ─────────── Main Page ─────────── */

function parseParams(sp: URLSearchParams) {
  return {
    page: Math.max(1, parseInt(sp.get("page") || "1", 10)),
    departmentFilter: sp.get("departmentId") || "",
    nameFilter: sp.get("search") || "",
    sortBy: sp.get("sortBy") || "submittedAt",
    sortOrder: (sp.get("sortOrder") === "asc" ? "asc" : "desc") as "asc" | "desc",
    statusFilter: sp.get("status") || "",
    dateFrom: sp.get("dateFrom") || "",
    dateTo: sp.get("dateTo") || "",
  };
}

export default function BasvurularPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nameInput, setNameInput] = useState("");
  const urlSyncedRef = useRef(false);

  useEffect(() => {
    const p = parseParams(searchParams);
    setPage(p.page);
    setDepartmentFilter(p.departmentFilter);
    setNameFilter(p.nameFilter);
    setNameInput(p.nameFilter);
    setSortBy(p.sortBy);
    setSortOrder(p.sortOrder);
    setStatusFilter(p.statusFilter);
    setDateFrom(p.dateFrom);
    setDateTo(p.dateTo);
    urlSyncedRef.current = true;
    // Sync from URL only on mount (and when searchParams reference changes from router)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUrl = useCallback(
    (updates: Partial<ReturnType<typeof parseParams>>) => {
      const params = new URLSearchParams();
      const pageVal = updates.page ?? page;
      const departmentVal = updates.departmentFilter ?? departmentFilter;
      const searchVal = updates.nameFilter ?? nameFilter;
      const sortByVal = updates.sortBy ?? sortBy;
      const sortOrderVal = updates.sortOrder ?? sortOrder;
      const statusVal = updates.statusFilter ?? statusFilter;
      const dateFromVal = updates.dateFrom ?? dateFrom;
      const dateToVal = updates.dateTo ?? dateTo;
      if (pageVal > 1) params.set("page", String(pageVal));
      if (departmentVal) params.set("departmentId", departmentVal);
      if (searchVal.trim()) params.set("search", searchVal.trim());
      if (sortByVal !== "submittedAt") params.set("sortBy", sortByVal);
      if (sortOrderVal !== "desc") params.set("sortOrder", sortOrderVal);
      if (statusVal) params.set("status", statusVal);
      if (dateFromVal) params.set("dateFrom", dateFromVal);
      if (dateToVal) params.set("dateTo", dateToVal);
      router.replace(`${pathname}${params.toString() ? "?" + params.toString() : ""}`);
    },
    [pathname, router, page, departmentFilter, nameFilter, sortBy, sortOrder, statusFilter, dateFrom, dateTo],
  );

  const handleNameSearch = useCallback((value: string) => {
    setNameInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setNameFilter(value);
      setPage(1);
    }, 400);
  }, []);

  // Modal state
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openDetail = useCallback((id: string) => {
    setSelectedAppId(id);
    setModalOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setModalOpen(false);
    setSelectedAppId(null);
  }, []);

  // Fetch departments
  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const serialized = JSON.parse(
            JSON.stringify(json.data, (_k: string, v: unknown) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          );
          setDepartments(serialized);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!urlSyncedRef.current) return;
    updateUrl({ page, departmentFilter, nameFilter, sortBy, sortOrder, statusFilter, dateFrom, dateTo });
  }, [page, departmentFilter, nameFilter, sortBy, sortOrder, statusFilter, dateFrom, dateTo, updateUrl]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        sortBy,
        sortOrder,
      });
      if (departmentFilter) params.set("departmentId", departmentFilter);
      if (nameFilter.trim()) params.set("search", nameFilter.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/applications?${params}`);
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
        setMeta(json.meta);
      }
    } catch (err) {
      console.error("Applications fetch error:", err);
    }
    setLoading(false);
  }, [page, departmentFilter, nameFilter, sortBy, sortOrder, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === applications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(applications.map((a) => a.id)));
  }, [applications, selectedIds.size]);

  const handleBulkStatus = useCallback(
    async (status: string) => {
      if (selectedIds.size === 0) return;
      setBulkUpdating(true);
      try {
        const res = await fetch("/api/admin/applications/bulk-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationIds: Array.from(selectedIds),
            status,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(`${json.data.updated} başvuru güncellendi`);
          setSelectedIds(new Set());
          fetchApplications();
        } else toast.error(json.error || "Güncellenemedi");
      } catch {
        toast.error("Bağlantı hatası");
      }
      setBulkUpdating(false);
    },
    [selectedIds, fetchApplications],
  );

  const handleExportExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "2000",
        sortBy,
        sortOrder,
      });
      if (departmentFilter) params.set("departmentId", departmentFilter);
      if (nameFilter.trim()) params.set("search", nameFilter.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/admin/applications?${params}`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        toast.error("Veri alınamadı");
        return;
      }
      const items = json.data.map((app: ApplicationRow) => ({
        fullName: app.fullName,
        email: app.email,
        phone: app.phone ?? "",
        department: app.department?.name ?? "",
        positionTitle: app.positionTitle ?? "",
        overallScore: app.evaluation?.overallScore ?? 0,
        recommendation: (app.evaluation as { recommendation?: string })?.recommendation ?? null,
        finalDecision: (app.evaluation as { finalDecision?: string })?.finalDecision ?? null,
        manualNote: null,
      }));
      await exportListToExcel(items);
      toast.success("Excel indirildi");
    } catch {
      toast.error("Dışa aktarma hatası");
    }
  }, [departmentFilter, nameFilter, sortBy, sortOrder, statusFilter, dateFrom, dateTo]);

  // Sort toggle handler
  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy],
  );

  // Format date helper
  const formatDate = useMemo(
    () => (dateStr: string | null | undefined) => {
      if (!dateStr) return "—";
      return new Date(dateStr).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    [],
  );

  return (
    <div className="space-y-5 w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-heading text-mr-navy">Başvurular</h1>
          <p className="text-sm text-mr-text-muted mt-0.5">
            Tüm başvuruları görüntüleyin ve yönetin
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="text-sm px-3 py-1 border-mr-navy text-mr-navy self-start"
          >
            Toplam: {meta.total}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-mr-navy/30 hover:bg-mr-navy hover:text-white cursor-pointer"
          >
            Dışa aktar (Excel)
          </Button>
        </div>
      </div>

      {/* Bulk toolbar */}
      {selectedIds.size > 0 && (
        <Card className="border-mr-gold/40 bg-mr-gold/5">
          <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-mr-navy">
              {selectedIds.size} başvuru seçildi
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="cursor-pointer"
              >
                Seçimi kaldır
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    disabled={bulkUpdating}
                    className="bg-mr-navy hover:bg-mr-navy-light text-white cursor-pointer"
                  >
                    {bulkUpdating ? "Güncelleniyor..." : "Seçilenlere durum ata"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <DropdownMenuItem
                      key={val}
                      onClick={() => handleBulkStatus(val)}
                      className="cursor-pointer"
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Sort Bar — mobile-first: wrap, no horizontal scroll */}
      <Card className="border-mr-gold/20 w-full min-w-0">
        <CardContent className="pt-4 pb-3 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            {/* Name Search */}
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial sm:w-auto">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap shrink-0">
                Ara:
              </span>
              <Input
                type="text"
                placeholder="Ad, e-posta, başvuru no veya telefon"
                value={nameInput}
                onChange={(e) => handleNameSearch(e.target.value)}
                className="w-full min-w-0 sm:w-48 h-8 text-sm"
                aria-label="Arama"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap shrink-0">
                Durum:
              </span>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => {
                  setStatusFilter(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full min-w-0 sm:w-40 h-8 text-sm" aria-label="Durum filtresi">
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap shrink-0">
                Departman:
              </span>
              <Select
                value={departmentFilter || "all"}
                onValueChange={(v) => {
                  setDepartmentFilter(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full min-w-0 sm:min-w-[11rem] sm:w-auto h-8 text-sm"
                  aria-label="Departman filtresi"
                >
                  <SelectValue placeholder="Tüm Departmanlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Departmanlar</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap shrink-0">
                Başlangıç:
              </span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full min-w-0 sm:w-36 h-8 text-sm"
                aria-label="Başlangıç tarihi"
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap shrink-0">
                Bitiş:
              </span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full min-w-0 sm:w-36 h-8 text-sm"
                aria-label="Bitiş tarihi"
              />
            </div>

            {/* Sort Buttons */}
            <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
              <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap">
                Sırala:
              </span>
              <SortButton
                label="Tarih"
                active={sortBy === "submittedAt"}
                direction={sortBy === "submittedAt" ? sortOrder : "desc"}
                onClick={() => handleSort("submittedAt")}
              />
              <SortButton
                label="İsim"
                active={sortBy === "fullName"}
                direction={sortBy === "fullName" ? sortOrder : "desc"}
                onClick={() => handleSort("fullName")}
              />
              <SortButton
                label="Puan"
                active={sortBy === "score"}
                direction={sortBy === "score" ? sortOrder : "desc"}
                onClick={() => handleSort("score")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table — desktop */}
      <div className="hidden md:block">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-mr-bg-secondary">
                  <TableHead className="w-10 font-semibold text-mr-navy">
                    <input
                      type="checkbox"
                      checked={applications.length > 0 && selectedIds.size === applications.length}
                      onChange={toggleSelectAll}
                      aria-label="Tümünü seç"
                      className="rounded border-mr-navy/30 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy">
                    Tarih
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy">
                    Ad Soyad
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy hidden md:table-cell">
                    Departman
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy text-center">
                    AI Puanı
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy text-center hidden sm:table-cell">
                    AI Sonucu
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy text-center">
                    Genel Sonuç
                  </TableHead>
                  <TableHead className="font-semibold text-mr-navy text-center hidden lg:table-cell">
                    Değ. Tarihi
                  </TableHead>
                  <TableHead className="w-18"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <AppTableSkeleton rows={6} cols={9} />
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center p-0">
                      <EmptyState
                        title="Başvuru bulunamadı."
                        description="Filtreleri değiştirmeyi deneyin."
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading &&
                  applications.length > 0 &&
                  applications.map((app) => (
                    <TableRow
                      key={app.id}
                      className="hover:bg-mr-gold/5 cursor-pointer transition-colors group"
                      onClick={() => openDetail(app.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => toggleSelect(app.id)}
                          aria-label={`${app.fullName} seç`}
                          className="rounded border-mr-navy/30 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="text-sm text-mr-text-secondary">
                        {formatDate(app.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-mr-navy">
                          {app.fullName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className="text-xs border-mr-navy/20 text-mr-navy"
                        >
                          {app.department?.name || app.positionTitle || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={app.evaluation?.overallScore} />
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {app.evaluation ? (
                          <Badge
                            variant="outline"
                            className={`text-xs ${EVAL_STATUS_COLORS[app.evaluation.status] || EVAL_STATUS_COLORS.not_evaluated}`}
                          >
                            {EVAL_STATUS_LABELS[app.evaluation.status] ||
                              app.evaluation.status}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className={EVAL_STATUS_COLORS.not_evaluated}
                          >
                            {EVAL_STATUS_LABELS.not_evaluated}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {STATUS_LABELS[app.status] || app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-mr-text-secondary hidden lg:table-cell">
                        {formatDate(app.evaluation?.evaluatedAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-mr-navy hover:text-mr-gold cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(app.id);
                          }}
                        >
                          →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Applications — mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-sm text-mr-text-muted">Yükleniyor...</span>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                title="Başvuru bulunamadı."
                description="Filtreleri değiştirmeyi deneyin."
              />
            </CardContent>
          </Card>
        ) : (
          applications.map((app) => (
            <Card
              key={app.id}
              className="cursor-pointer hover:border-mr-gold/50 transition-colors"
              onClick={() => openDetail(app.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      onChange={() => toggleSelect(app.id)}
                      aria-label={`${app.fullName} seç`}
                      className="rounded border-mr-navy/30 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-mr-navy">{app.fullName}</div>
                    <div className="text-xs text-mr-text-secondary mt-0.5">
                      {app.applicationNo}
                      {app.department?.name && ` · ${app.department.name}`}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <ScoreBadge score={app.evaluation?.overallScore} />
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {STATUS_LABELS[app.status] || app.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-mr-text-muted mt-1">
                      {formatDate(app.submittedAt)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-mr-text-muted">
            Toplam{" "}
            <span className="font-semibold text-mr-navy">{meta.total}</span>{" "}
            başvuru &middot; Sayfa{" "}
            <span className="font-semibold text-mr-navy">
              {meta.page}/{meta.totalPages}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="border-mr-navy/20 hover:bg-mr-navy hover:text-white"
            >
              ← Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="border-mr-navy/20 hover:bg-mr-navy hover:text-white"
            >
              Sonraki →
            </Button>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        applicationId={selectedAppId}
        open={modalOpen}
        onClose={closeDetail}
        onUpdate={fetchApplications}
      />
    </div>
  );
}
