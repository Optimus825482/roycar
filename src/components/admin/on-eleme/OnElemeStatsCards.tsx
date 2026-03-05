"use client";

import { Card, CardContent } from "@/components/ui/card";

export interface OnElemeStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  avgScore: number;
}

export interface OnElemeRecommendations {
  shortlist: number;
  interview: number;
  consider: number;
  reject: number;
}

interface OnElemeStatsCardsProps {
  stats: OnElemeStats;
  recommendations: OnElemeRecommendations;
}

export function OnElemeStatsCards({
  stats,
  recommendations,
}: OnElemeStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card>
        <CardContent className="py-3 px-4">
          <div className="text-2xl font-bold text-mr-navy">{stats.total}</div>
          <div className="text-xs text-mr-text-secondary">Toplam Aday</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="text-2xl font-bold text-emerald-600">
            {stats.completed}
          </div>
          <div className="text-xs text-mr-text-secondary">
            Değerlendirilmiş
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="text-2xl font-bold text-amber-600">
            {stats.pending}
          </div>
          <div className="text-xs text-mr-text-secondary">Bekleyen</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="text-2xl font-bold text-blue-600">
            {stats.avgScore}
          </div>
          <div className="text-xs text-mr-text-secondary">Ort. Puan</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-600 font-medium">
              {recommendations.shortlist} KL
            </span>
            <span className="text-blue-600 font-medium">
              {recommendations.interview} MÜ
            </span>
            <span className="text-amber-600 font-medium">
              {recommendations.consider} DĞ
            </span>
            <span className="text-red-600 font-medium">
              {recommendations.reject} RD
            </span>
          </div>
          <div className="text-xs text-mr-text-secondary mt-1">
            Öneri Dağılımı
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
