"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  ClipboardList,
  PenTool,
  Filter,
  Bot,
  FolderInput,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/basvurular", label: "Başvurular", icon: ClipboardList },
  { href: "/admin/form-builder", label: "Form Builder", icon: PenTool },
  { href: "/admin/on-eleme", label: "Ön Eleme", icon: Filter },
  { href: "/admin/chat", label: "AI Asistan", icon: Bot },
  { href: "/admin/veri-aktarimi", label: "Veri Aktarımı", icon: FolderInput },
  { href: "/admin/ayarlar", label: "Ayarlar", icon: Settings },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-mr-bg-admin">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-mr-navy text-white transform transition-transform lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Ana navigasyon"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-white/10">
            <Link href="/admin" className="flex items-center gap-3 cursor-pointer group">
              <Image
                src="/images/logo_NOBG.PNG"
                alt="Merit Royal"
                width={140}
                height={46}
                className="transition-opacity group-hover:opacity-90"
                priority
              />
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200",
                    isActive
                      ? "bg-mr-gold/20 text-mr-gold shadow-sm"
                      : "text-white/70 hover:bg-white/8 hover:text-white hover:translate-x-0.5",
                  )}
                >
                  <IconComponent className="w-5 h-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-mr-gold/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-mr-gold" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-white/40">Giriş yapan</div>
                <div className="text-sm text-white/80 truncate">
                  {session?.user?.name || session?.user?.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-mr-navy cursor-pointer hover:text-mr-gold transition-colors"
            aria-label="Menüyü aç"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:block text-sm text-mr-text-secondary">
            İK Başvuru Değerlendirme Sistemi
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 cursor-pointer hover:bg-mr-navy/5 transition-colors"
                aria-label="Kullanıcı menüsü"
              >
                <div className="w-7 h-7 rounded-full bg-mr-navy/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-mr-navy" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {session?.user?.name || "Admin"}
                </span>
                <ChevronDown className="w-4 h-4 text-mr-text-secondary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/giris" })}
                className="text-mr-error cursor-pointer gap-2"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
