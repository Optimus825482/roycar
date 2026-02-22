"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading text-mr-navy">Dashboard</h1>
        <Link
          href="/admin/basvurular"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-mr-navy text-white text-sm font-medium hover:bg-mr-navy-light transition-colors"
        >
          📋 Tüm Başvuruları Görüntüle
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-mr-text-muted">Yükleniyor...</div>
      ) : stats ? (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
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
              <Card className="hover:shadow-md transition-shadow">
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
              <Card className="hover:shadow-md transition-shadow">
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
              <Card className="hover:shadow-md transition-shadow">
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

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-mr-text-secondary">
                  Durum Dağılımı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.statusDistribution).map(([status, count]) => (
                    <div
                    key={status}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 border"
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[status] || status}
                    </span>
                    <Badge variant="secondary" className="text-lg font-bold">{count}</Badge>
                  </div>
                ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Distribution */}
            {stats.departmentDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-mr-text-secondary">
                    Departman Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stats.departmentDistribution.map((d) => (
                      <div
                        key={d.departmentId}
                        className="flex items-center justify-between bg-mr-bg-secondary rounded-lg px-4 py-3"
                      >
                      <span className="text-sm font-medium text-mr-text-primary">
                        {d.departmentName}
                      </span>
                      <Badge variant="secondary" className="text-base font-bold">{d.count}</Badge>
                    </div>
                  ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
            <div className="text-center py-12 text-mr-text-muted">Veri yüklenemedi.</div>
      )}
    </div>
  );
}
