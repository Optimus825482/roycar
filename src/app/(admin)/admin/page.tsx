"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLoader } from "@/components/shared/AppLoader";
import {
  Users,
  Star,
  UserPlus,
  UserCheck,
  ClipboardList,
  Building2,
  BarChart3,
  PenTool,
  Filter,
} from "lucide-react";

interface StatsData {
  totalApplications: number;
  averageScore: number;
  statusDistribution: Record<string, number>;
  departmentDistribution: {
    departmentId: string;
    departmentName: string;
    count: number;
  }[];
}

interface RecentApp {
  id: string;
  applicationNo: string;
  fullName: string;
  status: string;
  submittedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Yeni",
  reviewed: "İncelendi",
  shortlisted: "Ön Eleme",
  rejected: "Reddedildi",
  hired: "İşe Alındı",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-600 text-white",
  reviewed: "bg-amber-500 text-white",
  shortlisted: "bg-green-600 text-white",
  rejected: "bg-red-600 text-white",
  hired: "bg-emerald-600 text-white",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/applications/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
    setLoading(false);
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/admin/applications?pageSize=10&sortBy=submittedAt&sortOrder=desc"
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecentApplications(
          json.data.map((a: { id: string; applicationNo: string; fullName: string; status: string; submittedAt: string }) => ({
            id: a.id,
            applicationNo: a.applicationNo,
            fullName: a.fullName,
            status: a.status,
            submittedAt: a.submittedAt,
          }))
        );
      }
    } catch (err) {
      console.error("Recent applications fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!loading) fetchRecent();
  }, [loading, fetchRecent]);

  return (
    <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-heading text-mr-navy">Dashboard</h1>
          <p className="text-sm text-mr-text-secondary mt-0.5">
            Genel bakış ve istatistikler
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/on-eleme"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-mr-gold text-mr-navy text-sm font-medium hover:bg-mr-gold-dark transition-all duration-200 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            Yeni Değerlendirme Oturumu
          </Link>
          <Link
            href="/admin/form-builder"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-mr-navy/30 text-mr-navy text-sm font-medium hover:bg-mr-navy/5 transition-all duration-200 cursor-pointer"
          >
            <PenTool className="w-4 h-4" />
            Form Builder
          </Link>
          <Link
            href="/admin/basvurular"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-mr-navy text-white text-sm font-medium hover:bg-mr-navy-light transition-all duration-200 cursor-pointer shadow-3d-btn hover:shadow-lg active:scale-[0.98]"
          >
            <ClipboardList className="w-4 h-4" />
            Tüm Başvuruları Görüntüle
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <AppLoader
            size="lg"
            text="Dashboard yükleniyor..."
            variant="spinner"
          />
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-3d hover:shadow-3d-lg transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  Toplam Başvuru
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-mr-navy/8 flex items-center justify-center group-hover:bg-mr-navy/15 transition-colors">
                  <Users className="w-5 h-5 text-mr-navy" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-mr-navy">
                  {stats.totalApplications}
                </p>
                <p className="text-xs text-mr-text-muted mt-1">
                  Tüm başvurular
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-3d hover:shadow-3d-lg transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  Ortalama Puan
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-mr-gold/10 flex items-center justify-center group-hover:bg-mr-gold/20 transition-colors">
                  <Star className="w-5 h-5 text-mr-gold" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-mr-gold">
                  {stats.averageScore}
                </p>
                <p className="text-xs text-mr-text-muted mt-1">
                  AI değerlendirmesi
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-3d hover:shadow-3d-lg transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  Yeni Başvuru
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-mr-info">
                  {stats.statusDistribution.new || 0}
                </p>
                <p className="text-xs text-mr-text-muted mt-1">
                  İnceleme bekliyor
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-3d hover:shadow-3d-lg transition-all duration-300 group">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  İşe Alınan
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-mr-success">
                  {stats.statusDistribution.hired || 0}
                </p>
                <p className="text-xs text-mr-text-muted mt-1">
                  Başarılı adaylar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card className="shadow-3d">
            <CardHeader className="flex flex-row items-center gap-2">
              <BarChart3 className="w-5 h-5 text-mr-gold" />
              <CardTitle className="text-sm text-mr-text-secondary font-medium">
                Durum Dağılımı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.statusDistribution).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border border-border/50 bg-white hover:shadow-md transition-all duration-200"
                    >
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-lg font-bold min-w-8 justify-center"
                      >
                        {count}
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Son Başvurular */}
          {recentApplications.length > 0 && (
            <Card className="shadow-3d">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  Son Başvurular
                </CardTitle>
                <Link
                  href="/admin/basvurular"
                  className="text-xs font-medium text-mr-gold hover:underline cursor-pointer"
                >
                  Tümünü gör
                </Link>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-left text-mr-text-secondary">
                        <th className="pb-2 pr-3 font-medium">Tarih</th>
                        <th className="pb-2 pr-3 font-medium">Ad Soyad</th>
                        <th className="pb-2 pr-3 font-medium">No</th>
                        <th className="pb-2 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplications.map((app) => (
                        <tr key={app.id} className="border-b border-border/30">
                          <td className="py-2 pr-3 text-mr-text-secondary">
                            {new Date(app.submittedAt).toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 pr-3">
                            <Link
                              href={`/admin/basvurular/${app.id}`}
                              className="font-medium text-mr-navy hover:text-mr-gold cursor-pointer"
                            >
                              {app.fullName}
                            </Link>
                          </td>
                          <td className="py-2 pr-3 text-mr-text-muted">
                            {app.applicationNo}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[app.status] || "bg-gray-100 text-gray-800"}`}
                            >
                              {STATUS_LABELS[app.status] || app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Distribution */}
          {stats.departmentDistribution.length > 0 && (
            <Card className="shadow-3d">
              <CardHeader className="flex flex-row items-center gap-2">
                <Building2 className="w-5 h-5 text-mr-gold" />
                <CardTitle className="text-sm text-mr-text-secondary font-medium">
                  Departman Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.departmentDistribution.map((d) => (
                    <div
                      key={d.departmentId}
                      className="flex items-center justify-between bg-mr-bg-secondary rounded-xl px-4 py-3.5 border border-border/30 hover:border-mr-gold/30 hover:shadow-sm transition-all duration-200"
                    >
                      <span className="text-sm font-medium text-mr-text-primary">
                        {d.departmentName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-base font-bold min-w-8 justify-center"
                      >
                        {d.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-mr-text-muted">
          Veri yüklenemedi.
        </div>
      )}
    </div>
  );
}
