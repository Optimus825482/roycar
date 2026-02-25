"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  ChefHat,
  Wine,
  UtensilsCrossed,
  Sparkles,
  Shield,
  Crown,
  BedDouble,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";

// ─── Types ───

type OrgPosition = {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  category: string;
  level: number;
  parentId: string | null;
  authorityScore: number;
  guestInteraction: number;
  teamSize: number;
  skills: Record<string, number> | null;
  sortOrder: number;
  children: OrgPosition[];
};

type FlatPosition = Omit<OrgPosition, "children" | "sortOrder">;

type OrgData = {
  settings: Record<string, string>;
  tree: OrgPosition[];
  flat: FlatPosition[];
};

// ─── Constants ───

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Users }
> = {
  management: {
    label: "Yönetim",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: Crown,
  },
  kitchen: { label: "Mutfak", color: "#0F4C75", bg: "#DBEAFE", icon: ChefHat },
  service: {
    label: "Servis",
    color: "#059669",
    bg: "#D1FAE5",
    icon: UtensilsCrossed,
  },
  bar: { label: "Bar", color: "#7C3AED", bg: "#EDE9FE", icon: Wine },
  banquet: {
    label: "Ziyafet",
    color: "#EA580C",
    bg: "#FED7AA",
    icon: Sparkles,
  },
  room_service: {
    label: "Oda Servisi",
    color: "#6D28D9",
    bg: "#EDE9FE",
    icon: BedDouble,
  },
  hygiene: { label: "Hijyen", color: "#475569", bg: "#F1F5F9", icon: Shield },
};

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Stratejik", color: "#D97706" },
  2: { label: "Operasyonel", color: "#2563EB" },
  3: { label: "İcra", color: "#475569" },
};

// ─── Tree Node Component ───

function TreeNode({
  node,
  depth = 0,
  defaultOpen = true,
}: {
  node: OrgPosition;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  const cat = CATEGORY_CONFIG[node.category] || CATEGORY_CONFIG.kitchen;
  const lvl = LEVEL_CONFIG[node.level] || LEVEL_CONFIG[3];
  const Icon = cat.icon;
  const hasChildren = node.children && node.children.length > 0;
  const childCount = hasChildren ? countDescendants(node) : 0;

  return (
    <div>
      {/* Node row */}
      <div
        className="group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150"
        style={{
          marginLeft: depth * 24,
          backgroundColor: hovered ? cat.bg : "transparent",
        }}
        onClick={() => hasChildren && setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role={hasChildren ? "button" : undefined}
        aria-expanded={hasChildren ? open : undefined}
      >
        {/* Expand/collapse toggle */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            open ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )
          ) : (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
          )}
        </div>

        {/* Category icon */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.bg }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
        </div>

        {/* Title + English */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {node.title}
            </span>
            {node.titleEn && (
              <span className="text-xs text-gray-600 truncate hidden sm:inline">
                {node.titleEn}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Level badge */}
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: lvl.color }}
          >
            L{node.level}
          </span>

          {/* Team size */}
          <span className="text-xs text-gray-700 font-medium hidden sm:flex items-center gap-1">
            <Users className="w-3 h-3" />
            {node.teamSize}
          </span>

          {/* Child count when collapsed */}
          {hasChildren && !open && (
            <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
              +{childCount}
            </span>
          )}
        </div>
      </div>

      {/* Description tooltip on hover */}
      {hovered && node.description && (
        <div
          className="text-xs text-gray-600 py-1 px-2 leading-relaxed"
          style={{ marginLeft: depth * 24 + 36 }}
        >
          {node.description}
        </div>
      )}

      {/* Children */}
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              defaultOpen={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countDescendants(node: OrgPosition): number {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  );
}

// ─── Main Page ───

export default function OrganizasyonPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/org-chart");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Org chart fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  if (!data || data.flat.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-700">
        Organizasyon verileri henüz yüklenmedi.
      </div>
    );
  }

  const { settings, tree, flat } = data;
  const totalStaff = flat.reduce((sum, p) => sum + p.teamSize, 0);

  // Category stats
  const categoryStats = Object.entries(CATEGORY_CONFIG)
    .map(([key, cfg]) => {
      const positions = flat.filter((p) => p.category === key);
      const staff = positions.reduce((s, p) => s + p.teamSize, 0);
      return { key, ...cfg, count: positions.length, staff };
    })
    .filter((c) => c.count > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0F4C75] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-6 h-6 text-[#FF9F1C]" />
            <h1 className="text-xl font-bold tracking-wide">
              {settings.title || "F&B Organizasyon Yapısı"}
            </h1>
          </div>
          <p className="text-sm text-white/70">
            {settings.subtitle ||
              "Organizasyonel Hiyerarşi ve Operasyonel Yapı"}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold">{flat.length}</div>
              <div className="text-[11px] text-white/70">Pozisyon</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold">{totalStaff}</div>
              <div className="text-[11px] text-white/70">Personel</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-lg font-bold">{categoryStats.length}</div>
              <div className="text-[11px] text-white/70">Departman</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Description */}
        {settings.description && (
          <p className="text-sm text-gray-700 leading-relaxed">
            {settings.description}
          </p>
        )}

        {/* Category legend */}
        <div className="flex flex-wrap gap-2">
          {categoryStats.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.key}
                className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-full px-3 py-1.5 bg-white"
              >
                <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                <span className="font-semibold text-gray-800">{c.label}</span>
                <span className="text-gray-600">
                  {c.count} poz · {c.staff} kişi
                </span>
              </div>
            );
          })}
        </div>

        {/* Org Tree */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="w-1 h-4 bg-[#FF9F1C] rounded-full" />
            <h2 className="text-sm font-bold text-[#0F4C75]">
              Organizasyon Hiyerarşisi
            </h2>
            <span className="text-[10px] text-gray-600 ml-auto">
              Tıklayarak açıp kapatabilirsiniz
            </span>
          </div>

          <div className="space-y-0">
            {tree.map((root) => (
              <TreeNode key={root.id} node={root} defaultOpen />
            ))}
          </div>
        </div>

        {/* Level breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="w-1 h-4 bg-[#FF9F1C] rounded-full" />
            <h2 className="text-sm font-bold text-[#0F4C75]">
              Seviye Dağılımı
            </h2>
          </div>

          <div className="space-y-3">
            {Object.entries(LEVEL_CONFIG).map(([level, cfg]) => {
              const lvlPositions = flat.filter(
                (p) => p.level === Number(level),
              );
              if (lvlPositions.length === 0) return null;
              const lvlStaff = lvlPositions.reduce((s, p) => s + p.teamSize, 0);
              const pct = Math.round((lvlStaff / totalStaff) * 100);

              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: cfg.color }}
                      >
                        L{level}
                      </span>
                      <span className="text-xs font-semibold text-gray-800">
                        {cfg.label} Yönetim
                      </span>
                    </div>
                    <span className="text-xs text-gray-700">
                      {lvlPositions.length} pozisyon · {lvlStaff} kişi
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cfg.color,
                        minWidth: "2rem",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 py-4">
          F&B Career System — Organizasyon Şeması
        </div>
      </div>
    </div>
  );
}
