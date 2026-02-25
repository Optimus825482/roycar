"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  ExternalLink,
  X,
  ChefHat,
  Wine,
  UtensilsCrossed,
  Sparkles,
  Shield,
  Crown,
  BedDouble,
  Users,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
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
  isActive: boolean;
};

type TreePosition = OrgPosition & { children: TreePosition[] };

// ─── Constants ───

const CATEGORIES = [
  { value: "management", label: "Yönetim" },
  { value: "kitchen", label: "Mutfak" },
  { value: "service", label: "Servis" },
  { value: "bar", label: "Bar" },
  { value: "banquet", label: "Ziyafet" },
  { value: "room_service", label: "Oda Servisi" },
  { value: "hygiene", label: "Hijyen" },
];

const LEVELS = [
  { value: 1, label: "Stratejik (1)" },
  { value: 2, label: "Operasyonel (2)" },
  { value: 3, label: "İcra (3)" },
];

const CAT_CONFIG: Record<
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

const LEVEL_COLORS: Record<number, string> = {
  1: "#D97706",
  2: "#2563EB",
  3: "#475569",
};

const SKILL_LABELS: Record<string, string> = {
  management: "Yönetim",
  technical: "Teknik",
  social: "Sosyal",
  physical: "Fiziksel",
  crisis: "Kriz",
};

const EMPTY_FORM = {
  title: "",
  titleEn: "",
  description: "",
  category: "kitchen",
  level: 3,
  parentId: "",
  authorityScore: 0,
  guestInteraction: 0,
  teamSize: 1,
  skills: { management: 0, technical: 0, social: 0, physical: 0, crisis: 0 },
  sortOrder: 0,
};

// ─── Build tree from flat list ───

function buildTree(positions: OrgPosition[]): TreePosition[] {
  const map = new Map<string, TreePosition>();
  const roots: TreePosition[] = [];
  for (const p of positions) {
    map.set(p.id, { ...p, children: [] });
  }
  for (const p of positions) {
    const node = map.get(p.id)!;
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Tree Node ───

function AdminTreeNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
  defaultOpen = true,
}: {
  node: TreePosition;
  depth?: number;
  selectedId: string | null;
  onSelect: (p: OrgPosition) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cat = CAT_CONFIG[node.category] || CAT_CONFIG.kitchen;
  const Icon = cat.icon;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150"
        style={{
          marginLeft: depth * 24,
          backgroundColor: isSelected ? cat.bg : "transparent",
          borderLeft: isSelected
            ? `3px solid ${cat.color}`
            : "3px solid transparent",
        }}
        onClick={() => onSelect(node)}
      >
        {/* Expand toggle */}
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setOpen(!open);
          }}
        >
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
        </button>

        {/* Icon */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: cat.bg }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {node.title}
            </span>
            {node.titleEn && (
              <span className="text-xs text-gray-600 truncate hidden md:inline">
                {node.titleEn}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ backgroundColor: LEVEL_COLORS[node.level] || "#475569" }}
          >
            L{node.level}
          </span>
          <span className="text-xs text-gray-700 font-medium hidden sm:flex items-center gap-1">
            <Users className="w-3 h-3" />
            {node.teamSize}
          </span>
          {hasChildren && !open && (
            <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
              +{node.children.length}
            </span>
          )}
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AdminTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              defaultOpen={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ───

function DetailPanel({
  position,
  onClose,
  onEdit,
  onDelete,
}: {
  position: OrgPosition;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = CAT_CONFIG[position.category] || CAT_CONFIG.kitchen;
  const Icon = cat.icon;
  const catLabel =
    CATEGORIES.find((c) => c.value === position.category)?.label ||
    position.category;
  const levelLabel =
    LEVELS.find((l) => l.value === position.level)?.label ||
    `Seviye ${position.level}`;
  const skills = position.skills as Record<string, number> | null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: cat.color }}
      >
        <Icon className="w-5 h-5 text-white" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {position.title}
          </div>
          {position.titleEn && (
            <div className="text-xs text-white/80">{position.titleEn}</div>
          )}
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {position.description && (
          <p className="text-xs text-gray-700 leading-relaxed">
            {position.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Kategori</div>
            <div className="font-semibold text-gray-800">{catLabel}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Seviye</div>
            <div className="font-semibold text-gray-800">{levelLabel}</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Yetki Skoru</div>
            <div className="font-semibold text-gray-800">
              {position.authorityScore}/100
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Misafir Etkileşimi</div>
            <div className="font-semibold text-gray-800">
              {position.guestInteraction}/100
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Ekip Boyutu</div>
            <div className="font-semibold text-gray-800">
              {position.teamSize}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-600">Sıralama</div>
            <div className="font-semibold text-gray-800">
              {position.sortOrder}
            </div>
          </div>
        </div>

        {/* Skills */}
        {skills && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-gray-700">
              Yetkinlikler
            </div>
            {Object.entries(SKILL_LABELS).map(([key, label]) => {
              const val = skills[key] || 0;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-600">{label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${val}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-700 font-medium">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" /> Düzenle
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" /> Sil
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function AdminOrgChartPage() {
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<OrgPosition | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const tree = useMemo(() => buildTree(positions), [positions]);
  const totalStaff = useMemo(
    () => positions.reduce((s, p) => s + p.teamSize, 0),
    [positions],
  );

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/org-chart");
      const json = await res.json();
      if (json.success) setPositions(json.data as OrgPosition[]);
    } catch {
      console.error("Pozisyonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((p: OrgPosition) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      titleEn: p.titleEn || "",
      description: p.description || "",
      category: p.category,
      level: p.level,
      parentId: p.parentId || "",
      authorityScore: p.authorityScore,
      guestInteraction: p.guestInteraction,
      teamSize: p.teamSize,
      skills: { ...EMPTY_FORM.skills, ...(p.skills as Record<string, number>) },
      sortOrder: p.sortOrder,
    });
    setSelectedPosition(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Bu pozisyonu silmek istediğinize emin misiniz?")) return;
      try {
        const res = await fetch(`/api/admin/org-chart/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        setSelectedPosition(null);
        fetchPositions();
      } catch {
        alert("Pozisyon silinemedi.");
      }
    },
    [fetchPositions],
  );

  const handleSave = async () => {
    if (!form.title.trim()) return alert("Pozisyon başlığı gereklidir.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        parentId: form.parentId || null,
        skills: form.skills,
      };
      const url = editingId
        ? `/api/admin/org-chart/${editingId}`
        : "/api/admin/org-chart";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setDialogOpen(false);
      fetchPositions();
    } catch {
      alert("Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = useMemo(
    () => positions.filter((p) => p.id !== editingId),
    [positions, editingId],
  );

  // Category stats
  const categoryStats = useMemo(() => {
    return Object.entries(CAT_CONFIG)
      .map(([key, cfg]) => {
        const items = positions.filter((p) => p.category === key);
        return {
          key,
          ...cfg,
          count: items.length,
          staff: items.reduce((s, p) => s + p.teamSize, 0),
        };
      })
      .filter((c) => c.count > 0);
  }, [positions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-[#0F4C75]" />
          <h1 className="text-sm font-bold text-gray-800">
            F&B Organizasyon Şeması
          </h1>
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
            {positions.length} pozisyon · {totalStaff} personel
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="w-4 h-4" /> Yeni Pozisyon
          </Button>
          <a href="/organizasyon" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1">
              <ExternalLink className="w-4 h-4" /> Önizle
            </Button>
          </a>
        </div>
      </div>

      {/* Main content: Tree + Detail panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Category legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categoryStats.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.key}
                  className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-full px-2.5 py-1 bg-white"
                >
                  <Icon className="w-3 h-3" style={{ color: c.color }} />
                  <span className="font-semibold text-gray-800">{c.label}</span>
                  <span className="text-gray-600">{c.count}</span>
                </div>
              );
            })}
          </div>

          {/* Tree */}
          <div className="space-y-0">
            {tree.map((root) => (
              <AdminTreeNode
                key={root.id}
                node={root}
                selectedId={selectedPosition?.id || null}
                onSelect={setSelectedPosition}
                defaultOpen
              />
            ))}
          </div>

          {positions.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Henüz pozisyon eklenmemiş.</p>
              <Button size="sm" className="mt-3 gap-1" onClick={openCreate}>
                <Plus className="w-4 h-4" /> İlk Pozisyonu Ekle
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel (right side) */}
        {selectedPosition && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto p-4 shrink-0">
            <DetailPanel
              position={selectedPosition}
              onClose={() => setSelectedPosition(null)}
              onEdit={() => openEdit(selectedPosition)}
              onDelete={() => handleDelete(selectedPosition.id)}
            />
          </div>
        )}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingId ? "Pozisyon Düzenle" : "Yeni Pozisyon"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Pozisyon Adı *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn: Şef Aşçıbaşı"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                İngilizce Adı
              </label>
              <Input
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                placeholder="Örn: Executive Chef"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Açıklama
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Kategori
                </label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Seviye
                </label>
                <Select
                  value={String(form.level)}
                  onValueChange={(v) =>
                    setForm({ ...form, level: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={String(l.value)}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Üst Pozisyon
              </label>
              <Select
                value={form.parentId || "__none__"}
                onValueChange={(v) =>
                  setForm({ ...form, parentId: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Yok (Kök pozisyon)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Yok (Kök pozisyon)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Yetki Skoru
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.authorityScore}
                  onChange={(e) =>
                    setForm({ ...form, authorityScore: +e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Misafir Etk.
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.guestInteraction}
                  onChange={(e) =>
                    setForm({ ...form, guestInteraction: +e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Ekip Boyutu
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.teamSize}
                  onChange={(e) =>
                    setForm({ ...form, teamSize: +e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-2 block">
                Yetkinlikler (0-100)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SKILL_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20">{label}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 text-xs"
                      value={form.skills[key as keyof typeof form.skills]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          skills: { ...form.skills, [key]: +e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Sıralama
              </label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: +e.target.value })
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 gap-1"
              >
                <Save className="w-4 h-4" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
