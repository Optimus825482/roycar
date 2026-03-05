"use client";

import { useEffect, useState, useCallback, memo, useRef } from "react";
import {
  Users,
  Wine,
  UtensilsCrossed,
  Sparkles,
  Crown,
  BedDouble,
  ChevronDown,
  ChevronRight,
  Building2,
  ChefHat,
  LayoutGrid,
  ListTree,
  Layers,
  GitBranch,
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
  incumbentName?: string | null;
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
  kitchen: {
    label: "Mutfak",
    color: "#DC2626",
    bg: "#FEE2E2",
    icon: ChefHat,
  },
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
};

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Stratejik", color: "#D97706" },
  2: { label: "Operasyonel", color: "#2563EB" },
  3: { label: "İcra", color: "#475569" },
};

type ViewMode = "tree" | "cards" | "grouped" | "mermaid";

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof ListTree }[] = [
  { value: "tree", label: "Hiyerarşi", icon: ListTree },
  { value: "cards", label: "Kartlar", icon: LayoutGrid },
  { value: "grouped", label: "Kategoriler", icon: Layers },
  { value: "mermaid", label: "Diyagram", icon: GitBranch },
];

// ─── Tree Node Component ───

const TreeNode = memo(function TreeNode({
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
  const cat = CATEGORY_CONFIG[node.category] || CATEGORY_CONFIG.service;
  const lvl = LEVEL_CONFIG[node.level] || LEVEL_CONFIG[3];
  const Icon = cat.icon;
  const hasChildren = node.children && node.children.length > 0;
  const childCount = hasChildren ? countDescendants(node) : 0;

  const indent = Math.min(depth * 20, 80);

  return (
    <div className="min-w-0">
      {/* Node row — mobile-first: py-3 sm:py-2, touch-friendly */}
      <div
        className="group flex items-center gap-2 sm:gap-3 py-3 sm:py-2 px-3 sm:px-2 rounded-xl sm:rounded-lg cursor-pointer transition-all duration-200 min-h-[3.25rem] sm:min-h-0 border border-transparent hover:border-gray-200/80"
        style={{
          marginLeft: indent,
          backgroundColor: hovered ? cat.bg : "transparent",
        }}
        onClick={() => hasChildren && setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="treeitem"
        aria-expanded={hasChildren ? open : undefined}
        aria-label={node.incumbentName ? `${node.title}, Mevcut: ${node.incumbentName}` : node.title}
      >
        {/* Expand/collapse toggle — larger on mobile */}
        <div className="w-8 h-8 sm:w-5 sm:h-5 flex items-center justify-center shrink-0 rounded-md hover:bg-black/5">
          {hasChildren ? (
            open ? (
              <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4 text-mr-navy" />
            ) : (
              <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-mr-navy" />
            )
          ) : (
            <div
              className="w-2 h-2 sm:w-1.5 sm:h-1.5 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
          )}
        </div>

        {/* Category icon */}
        <div
          className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg sm:rounded-md flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: cat.bg }}
        >
          <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" style={{ color: cat.color }} />
        </div>

        {/* Title + English + Mevcut görevli */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 gap-0.5">
            <span className="text-sm sm:text-sm font-semibold text-mr-text-primary truncate">
              {node.title}
            </span>
            {node.titleEn && (
              <span className="text-xs text-mr-text-muted truncate hidden sm:inline">
                {node.titleEn}
              </span>
            )}
          </div>
          {node.incumbentName && (
            <div className="text-xs text-mr-text-secondary mt-1 sm:mt-0.5 flex items-center gap-1.5 truncate">
              <span className="inline-block w-1 h-1 rounded-full bg-mr-gold shrink-0" />
              <span className="font-medium text-mr-navy/90">{node.incumbentName}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span
            className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md shadow-sm"
            style={{ backgroundColor: lvl.color }}
          >
            L{node.level}
          </span>
          <span className="text-xs text-mr-text-secondary font-medium flex items-center gap-1">
            <Users className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
            {node.teamSize}
          </span>
          {hasChildren && !open && (
            <span className="text-[10px] text-mr-text-muted bg-mr-bg-secondary px-2 py-0.5 rounded-full font-medium">
              +{childCount}
            </span>
          )}
        </div>
      </div>

      {/* Description tooltip on hover */}
      {hovered && node.description && (
        <div
          className="text-xs text-mr-text-muted py-2 px-3 rounded-lg bg-mr-bg-secondary/80 border border-gray-100 ml-3 my-1 leading-relaxed"
          style={{ marginLeft: indent + 44 }}
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
});

function countDescendants(node: OrgPosition): number {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce(
    (sum, child) => sum + 1 + countDescendants(child),
    0,
  );
}

// ─── Position Card (for Cards view) ───

const PositionCard = memo(function PositionCard({ pos }: { pos: FlatPosition }) {
  const cat = CATEGORY_CONFIG[pos.category] || CATEGORY_CONFIG.service;
  const lvl = LEVEL_CONFIG[pos.level] || LEVEL_CONFIG[3];
  const Icon = cat.icon;
  return (
    <article
      className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow p-4 h-full flex flex-col min-w-0"
      style={{ borderLeftWidth: "3px", borderLeftColor: cat.color }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: cat.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-mr-text-primary leading-tight">
            {pos.title}
          </h3>
          {pos.titleEn && (
            <p className="text-xs text-mr-text-muted mt-0.5">{pos.titleEn}</p>
          )}
          {pos.incumbentName && (
            <p className="text-xs text-mr-navy/90 font-medium mt-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-mr-gold shrink-0" />
              {pos.incumbentName}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        <span
          className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md"
          style={{ backgroundColor: lvl.color }}
        >
          L{pos.level}
        </span>
        <span className="text-xs text-mr-text-muted flex items-center gap-1">
          <Users className="w-3 h-3" />
          {pos.teamSize} kişi
        </span>
      </div>
    </article>
  );
});

// ─── Grouped by category (flat list per category) ───

function GroupedView({
  flat,
  categoryStats,
}: {
  flat: FlatPosition[];
  categoryStats: { key: string; label: string; icon: typeof Users; bg: string; color: string; count: number; staff: number }[];
}) {
  return (
    <div className="space-y-6">
      {categoryStats.map((c) => {
        const positions = flat.filter((p) => p.category === c.key);
        const Icon = c.icon;
        return (
          <div key={c.key} className="min-w-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-t-xl border border-b-0 border-gray-200/80"
              style={{ backgroundColor: c.bg }}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color: c.color }} />
              <span className="font-semibold text-mr-text-primary">{c.label}</span>
              <span className="text-xs text-mr-text-muted ml-auto">
                {positions.length} pozisyon · {c.staff} kişi
              </span>
            </div>
            <ul className="border border-gray-200/80 rounded-b-xl divide-y divide-gray-100 overflow-hidden bg-white">
              {positions.map((pos) => {
                const lvl = LEVEL_CONFIG[pos.level] || LEVEL_CONFIG[3];
                return (
                  <li
                    key={pos.id}
                    className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 min-h-[3rem] hover:bg-mr-bg-secondary/50 transition-colors"
                  >
                    <span
                      className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md shrink-0"
                      style={{ backgroundColor: lvl.color }}
                    >
                      L{pos.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-mr-text-primary">
                        {pos.title}
                      </span>
                      {pos.titleEn && (
                        <span className="text-xs text-mr-text-muted ml-2 hidden sm:inline">
                          {pos.titleEn}
                        </span>
                      )}
                      {pos.incumbentName && (
                        <p className="text-xs text-mr-navy/90 mt-0.5 font-medium">
                          {pos.incumbentName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-mr-text-muted flex items-center gap-1 shrink-0">
                      <Users className="w-3 h-3" />
                      {pos.teamSize}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mermaid diagram: ağaçtan flowchart kodu + CDN ile render ───

function escapeMermaidLabel(s: string): string {
  return s.replace(/[[\]"]/g, (c) => (c === '"' ? "#quot;" : c === "[" ? "(" : ")")).replace(/\n/g, " ");
}

function buildMermaidFlowchart(tree: OrgPosition[]): string {
  const lines: string[] = ["flowchart TB"];
  let nodeIndex = 0;
  const idMap = new Map<string, string>();

  function walk(node: OrgPosition): string {
    let id = idMap.get(node.id);
    if (!id) {
      id = `N${nodeIndex++}`;
      idMap.set(node.id, id);
      const label = node.incumbentName
        ? `${node.title} · ${node.incumbentName}`
        : node.title;
      const safe = escapeMermaidLabel(label);
      lines.push(`  ${id}["${safe}"]`);
    }
    if (node.children?.length) {
      for (const child of node.children) {
        const childId = walk(child);
        lines.push(`  ${id} --> ${childId}`);
      }
    }
    return id;
  }

  for (const root of tree) {
    walk(root);
  }
  return lines.join("\n");
}

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";

function MermaidDiagramView({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const run = () => {
      const mermaid = (window as unknown as { mermaid?: { run: (opts?: { nodes?: HTMLElement[] }) => Promise<void>; initialize: (c: object) => void } }).mermaid;
      if (!mermaid) return;
      setStatus("loading");
      const el = document.createElement("div");
      el.className = "mermaid";
      el.textContent = code;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(el);
      mermaid
        .run({ nodes: [el] })
        .then(() => setStatus("ready"))
        .catch((err: Error) => {
          setStatus("error");
          setErrorMsg(err.message || "Diyagram çizilemedi.");
        });
    };

    if ((window as unknown as { mermaid?: unknown }).mermaid) {
      run();
      return;
    }

    const script = document.createElement("script");
    script.src = MERMAID_CDN;
    script.async = true;
    script.onload = () => {
      const m = (window as unknown as { mermaid?: { initialize: (c: object) => void } }).mermaid;
      m?.initialize({ startOnLoad: false, flowchart: { useMaxWidth: true } });
      run();
    };
    script.onerror = () => {
      setStatus("error");
      setErrorMsg("Mermaid kütüphanesi yüklenemedi.");
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [code]);

  if (status === "error") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
        <p className="font-medium">Diyagram yüklenemedi</p>
        {errorMsg && <p className="mt-1">{errorMsg}</p>}
        <pre className="mt-3 p-3 bg-white rounded border border-red-100 text-xs overflow-x-auto max-h-48">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <div ref={containerRef} className="mermaid-container flex justify-center py-4" />
      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-mr-text-muted text-sm">
          <div className="w-5 h-5 border-2 border-mr-gold/30 border-t-mr-gold rounded-full animate-spin" />
          Diyagram çiziliyor...
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function OrganizasyonPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-10 h-10 border-2 border-mr-gold/30 border-t-mr-gold rounded-full animate-spin" />
        <p className="text-sm text-mr-text-muted font-medium">Organizasyon yükleniyor...</p>
      </div>
    );
  }

  if (!data || data.flat.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Building2 className="w-12 h-12 text-mr-text-muted/50" />
        <p className="text-mr-text-secondary font-medium">Organizasyon verileri henüz yüklenmedi.</p>
        <p className="text-sm text-mr-text-muted">Lütfen daha sonra tekrar deneyin.</p>
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
    <div className="min-h-screen bg-mr-cream w-full min-w-0 overflow-x-hidden org-chart-preview">
      {/* Header — marka renkleri, mobile-first padding */}
      <header className="bg-mr-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-mr-gold/20 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-mr-gold" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading text-white">
                {settings.title || "F&B Organizasyon Yapısı"}
              </h1>
              <p className="text-sm text-white/80 mt-1">
                {settings.subtitle ||
                  "Organizasyonel Hiyerarşi ve Operasyonel Yapı"}
              </p>
            </div>
          </div>

          {/* Quick stats — grid mobile-first, 3 cols on sm */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4 sm:py-5 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{flat.length}</div>
              <div className="text-[11px] sm:text-xs text-white/70 mt-0.5 font-medium">Pozisyon</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4 sm:py-5 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{totalStaff}</div>
              <div className="text-[11px] sm:text-xs text-white/70 mt-0.5 font-medium">Personel</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-4 sm:py-5 text-center border border-white/10">
              <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{categoryStats.length}</div>
              <div className="text-[11px] sm:text-xs text-white/70 mt-0.5 font-medium">Departman</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Description */}
        {settings.description && (
          <p className="text-sm sm:text-base text-mr-text-secondary leading-relaxed">
            {settings.description}
          </p>
        )}

        {/* Category legend — pill style, wrap on mobile */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {categoryStats.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.key}
                className="inline-flex items-center gap-2 text-xs sm:text-sm border border-gray-200 rounded-full pl-2.5 pr-4 py-2 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: c.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <span className="font-semibold text-mr-text-primary">{c.label}</span>
                <span className="text-mr-text-muted">
                  {c.count} poz · {c.staff} kişi
                </span>
              </div>
            );
          })}
        </div>

        {/* Görünüm seçici + Org içerik */}
        <section aria-label="Organizasyon görünümü" className="min-w-0">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-mr-navy/5 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-mr-bg-secondary/50">
              <div className="w-1 h-5 bg-mr-gold rounded-full shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-mr-navy font-heading">
                Organizasyon
              </h2>
              {/* Görünüm stili seçici — üstten değiştirilebilir */}
              <div
                className="flex flex-nowrap rounded-lg border border-gray-200 bg-white p-0.5 ml-auto overflow-x-auto min-w-0"
                role="tablist"
                aria-label="Görünüm stili"
              >
                {VIEW_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = viewMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setViewMode(opt.value)}
                      className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-md px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-1 ${
                        isActive
                          ? "bg-mr-navy text-white shadow-sm"
                          : "text-mr-text-secondary hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="text-xs sm:text-sm text-mr-navy hover:text-mr-gold-dark font-semibold focus:outline-none focus:ring-2 focus:ring-mr-gold focus:ring-offset-2 rounded-lg px-3 py-1.5 transition-colors order-last sm:order-none w-full sm:w-auto flex justify-center sm:inline-flex"
              >
                Yazdır
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-x-auto min-w-0">
              {viewMode === "tree" && (
                <div role="tree" aria-label="Pozisyon ağacı">
                  <p className="text-[10px] sm:text-xs text-mr-text-muted mb-2">
                    Dalları tıklayarak açıp kapatabilirsiniz
                  </p>
                  <div className="space-y-0.5">
                    {tree.map((root) => (
                      <TreeNode key={root.id} node={root} defaultOpen />
                    ))}
                  </div>
                </div>
              )}

              {viewMode === "cards" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {flat.map((pos) => (
                    <PositionCard key={pos.id} pos={pos} />
                  ))}
                </div>
              )}

              {viewMode === "grouped" && (
                <GroupedView flat={flat} categoryStats={categoryStats} />
              )}

              {viewMode === "mermaid" && (
                <MermaidDiagramView code={buildMermaidFlowchart(tree)} />
              )}
            </div>
          </div>
        </section>

        {/* Level breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-mr-navy/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100 bg-mr-bg-secondary/50">
            <div className="w-1 h-5 bg-mr-gold rounded-full shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-mr-navy font-heading">
              Seviye Dağılımı
            </h2>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {Object.entries(LEVEL_CONFIG).map(([level, cfg]) => {
              const lvlPositions = flat.filter(
                (p) => p.level === Number(level),
              );
              if (lvlPositions.length === 0) return null;
              const lvlStaff = lvlPositions.reduce((s, p) => s + p.teamSize, 0);
              const pct = Math.round((lvlStaff / totalStaff) * 100);

              return (
                <div key={level} className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: cfg.color }}
                      >
                        L{level}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-mr-text-primary">
                        {cfg.label} Yönetim
                      </span>
                    </div>
                    <span className="text-xs text-mr-text-muted">
                      {lvlPositions.length} pozisyon · {lvlStaff} kişi
                    </span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-mr-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cfg.color,
                        minWidth: "1.5rem",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-mr-text-muted py-6 sm:py-8 border-t border-gray-100">
          F&B Career System — Organizasyon Şeması
        </footer>
      </div>
    </div>
  );
}
