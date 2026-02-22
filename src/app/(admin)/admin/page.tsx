"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface StatsData {
  totalApplications: number;
  averageScore: number;
  statusDistribution: Record<string, number>;
  departmentDistribution: {
    departmentId: string;
    departmentName: string;
    count: number;
  }[];
  recentApplications: ApplicationRow[];
}

interface ApplicationRow {
  id: string;
  applicationNo: string;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  submittedAt: string;
  department: { name: string };
  evaluation: { overallScore: number; status: string; report: unknown } | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewed: "bg-yellow-100 text-yellow-800",
  shortlisted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  hired: "bg-emerald-100 text-emerald-800",
};

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null)
    return <span className="text-mr-text-muted text-sm">—</span>;
  const color =
    score >= 70
      ? "text-mr-success"
      : score >= 40
        ? "text-mr-warning"
        : "text-mr-error";
  return <span className={`font-semibold ${color}`}>{score}</span>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/applications/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
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
  }, [page, search, statusFilter, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading text-mr-navy">Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-mr-text-secondary">
                Toplam Başvuru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-mr-navy">
                {stats.totalApplications}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-mr-text-secondary">
                Ortalama Puan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-mr-gold">
                {stats.averageScore}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-mr-text-secondary">
                Yeni Başvuru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-mr-info">
                {stats.statusDistribution.new || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-mr-text-secondary">
                İşe Alınan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-mr-success">
                {stats.statusDistribution.hired || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department Distribution */}
      {stats && stats.departmentDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-mr-text-secondary">
              Departman Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.departmentDistribution.map((d) => (
                <div
                  key={d.departmentId}
                  className="flex items-center gap-2 bg-mr-bg-secondary rounded-md px-3 py-1.5"
                >
                  <span className="text-sm text-mr-text-primary">
                    {d.departmentName}
                  </span>
                  <Badge variant="secondary">{d.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Ad, e-posta veya başvuru no ile ara..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="sm:max-w-xs"
                aria-label="Başvuru ara"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="sm:w-[180px]"
                  aria-label="Durum filtresi"
                >
                  <SelectValue placeholder="Durum Filtresi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="sm:w-[180px]"
                  aria-label="Sıralama kriteri"
                >
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submittedAt">Tarih</SelectItem>
                  <SelectItem value="score">Puan</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                }
                aria-label={
                  sortOrder === "desc" ? "Artan sırala" : "Azalan sırala"
                }
              >
                {sortOrder === "desc" ? "↓ Azalan" : "↑ Artan"}
              </Button>
            </div>
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="dateFrom"
                  className="text-xs text-mr-text-muted"
                >
                  Başlangıç
                </label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="sm:w-[160px]"
                  aria-label="Başlangıç tarihi"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dateTo" className="text-xs text-mr-text-muted">
                  Bitiş
                </label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="sm:w-[160px]"
                  aria-label="Bitiş tarihi"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                  aria-label="Tarih filtresini temizle"
                >
                  ✕ Temizle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başvuru No</TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead className="hidden md:table-cell">
                  Departman
                </TableHead>
                <TableHead className="hidden sm:table-cell">Tarih</TableHead>
                <TableHead>Puan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-mr-text-muted"
                  >
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-mr-text-muted"
                  >
                    Başvuru bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-xs">
                      {app.applicationNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{app.fullName}</div>
                        <div className="text-xs text-mr-text-muted">
                          {app.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {app.department.name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {new Date(app.submittedAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={app.evaluation?.overallScore} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/basvurular/${app.id}`}>
                        <Button variant="ghost" size="sm">
                          Detay
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-mr-text-muted">
            Toplam {meta.total} başvuru, Sayfa {meta.page}/{meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
