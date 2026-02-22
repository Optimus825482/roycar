"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    department: { name: string };
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
    new: "bg-blue-100 text-blue-800 border-blue-200",
    reviewed: "bg-amber-100 text-amber-800 border-amber-200",
    shortlisted: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    hired: "bg-green-100 text-green-800 border-green-200",
};

const EVAL_STATUS_LABELS: Record<string, string> = {
    completed: "Tamamlandı",
    pending: "Bekliyor",
    failed: "Hata",
    not_evaluated: "Değerlendirilmedi",
};

const EVAL_STATUS_COLORS: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    not_evaluated: "bg-gray-50 text-gray-500 border-gray-200",
};

/* ─────────── Helper Components ─────────── */

function ScoreBadge({ score }: { score: number | null | undefined }) {
    if (score == null) return <Badge variant="outline" className="text-gray-400 border-gray-200">—</Badge>;

    let colorClass = "bg-red-50 text-red-700 border-red-200";
    if (score >= 70) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    else if (score >= 40) colorClass = "bg-amber-50 text-amber-700 border-amber-200";

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
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${active
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

export default function BasvurularPage() {
    const [applications, setApplications] = useState<ApplicationRow[]>([]);
    const [meta, setMeta] = useState<PaginationMeta>({
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
    });
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & sorting
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [sortBy, setSortBy] = useState("submittedAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);

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

    // Fetch applications
    useEffect(() => {
        let cancelled = false;
        const fetchApplications = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    pageSize: "20",
                    sortBy,
                    sortOrder,
                });
                if (departmentFilter) params.set("departmentId", departmentFilter);

                const res = await fetch(`/api/admin/applications?${params}`);
                const json = await res.json();
                if (!cancelled && json.success) {
                    setApplications(json.data);
                    setMeta(json.meta);
                }
            } catch (err) {
                console.error("Applications fetch error:", err);
            }
            if (!cancelled) setLoading(false);
        };
        fetchApplications();
        return () => { cancelled = true; };
    }, [page, departmentFilter, sortBy, sortOrder]);

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
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-heading text-mr-navy">Başvurular</h1>
                    <p className="text-sm text-mr-text-muted mt-0.5">
                        Tüm başvuruları görüntüleyin ve yönetin
                    </p>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 border-mr-navy text-mr-navy self-start">
                    Toplam: {meta.total}
                </Badge>
            </div>

            {/* Filter & Sort Bar */}
            <Card className="border-mr-gold/20">
                <CardContent className="pt-4 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Department Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-mr-text-secondary whitespace-nowrap">
                                Departman:
                            </span>
                            <Select
                                value={departmentFilter || "all"}
                                onValueChange={(v) => {
                                    setDepartmentFilter(v === "all" ? "" : v);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-50 h-8 text-sm" aria-label="Departman filtresi">
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

                        {/* Sort Buttons */}
                        <div className="flex items-center gap-2 sm:ml-auto">
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

            {/* Applications Table */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-mr-bg-secondary">
                                    <TableHead className="font-semibold text-mr-navy">Tarih</TableHead>
                                    <TableHead className="font-semibold text-mr-navy">Ad Soyad</TableHead>
                                    <TableHead className="font-semibold text-mr-navy hidden md:table-cell">Departman</TableHead>
                                    <TableHead className="font-semibold text-mr-navy text-center">AI Puanı</TableHead>
                                    <TableHead className="font-semibold text-mr-navy text-center hidden sm:table-cell">AI Sonucu</TableHead>
                                    <TableHead className="font-semibold text-mr-navy text-center">Genel Sonuç</TableHead>
                                    <TableHead className="font-semibold text-mr-navy text-center hidden lg:table-cell">Değ. Tarihi</TableHead>
                                    <TableHead className="w-18"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-mr-gold border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm text-mr-text-muted">Yükleniyor...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : applications.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-3xl">📭</span>
                                                <span className="text-sm text-mr-text-muted">Başvuru bulunamadı.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    applications.map((app) => (
                                        <TableRow
                                            key={app.id}
                                            className="hover:bg-mr-gold/5 cursor-pointer transition-colors group"
                                        >
                                            <TableCell className="text-sm text-mr-text-secondary">
                                                {formatDate(app.submittedAt)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-mr-navy">{app.fullName}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline" className="text-xs border-mr-navy/20 text-mr-navy">
                                                    {app.department.name}
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
                                                        {EVAL_STATUS_LABELS[app.evaluation.status] || app.evaluation.status}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className={EVAL_STATUS_COLORS.not_evaluated}>
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
                                                <Link href={`/admin/basvurular/${app.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-mr-navy hover:text-mr-gold"
                                                    >
                                                        →
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-sm text-mr-text-muted">
                        Toplam <span className="font-semibold text-mr-navy">{meta.total}</span> başvuru
                        &middot; Sayfa{" "}
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
        </div>
    );
}
