"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Boxes,
  Home,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/lib/auth";
import { COMERCIO, ROLES_LABELS } from "@/lib/constants";
import { getIniciales } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: number;
  adminOnly?: boolean;
  isActive: (pathname: string) => boolean;
}

export function AppShell({
  user,
  bajoMinimoCount,
  children,
}: {
  user: AuthUser;
  bajoMinimoCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems: NavItem[] = [
    {
      label: "Inicio",
      href: "/",
      icon: Home,
      isActive: (p) => p === "/",
    },
    {
      label: "Ventas",
      href: "/ventas",
      icon: ReceiptText,
      isActive: (p) => p === "/ventas" || p.startsWith("/ventas/"),
    },
    {
      label: "Productos",
      href: "/productos",
      icon: Boxes,
      badge: bajoMinimoCount > 0 ? bajoMinimoCount : undefined,
      isActive: (p) => p === "/productos" || p.startsWith("/productos/"),
    },
    {
      label: "Clientes",
      href: "/clientes",
      icon: Users,
      isActive: (p) => p === "/clientes" || p.startsWith("/clientes/"),
    },
    {
      label: "Usuarios",
      href: "/usuarios",
      icon: ShieldCheck,
      adminOnly: true,
      isActive: (p) => p === "/usuarios" || p.startsWith("/usuarios/"),
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user.rol === "admin"
  );

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#121e26] text-slate-200 select-none">
      {/* Marca */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 min-w-0"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#5ec8bd] text-[#0f2228] font-bold text-base">
            M
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-white leading-tight truncate">
              {COMERCIO.appName}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {COMERCIO.nombreCorto}
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label="Cerrar menú"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Botón Nueva venta */}
      <div className="px-4 pb-4">
        <Link
          href="/ventas/nueva"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-lg bg-[#5ec8bd] px-3.5 py-2.5 text-sm font-semibold text-[#0d2228] shadow-xs transition-colors hover:bg-[#4ebbb0]"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>Nueva venta</span>
        </Link>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-3 space-y-1" aria-label="Módulos del sistema">
        {visibleItems.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#1c303b] text-white"
                  : "text-slate-300/90 hover:bg-white/5 hover:text-white"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#5ec8bd]" />
              )}
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-[#5ec8bd]" : "text-slate-400"
                  )}
                />
                <span>{item.label}</span>
              </span>
              {item.badge !== undefined && (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300 tabular-nums">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pie legal */}
      <div className="px-4 py-4 border-t border-white/5">
        <p className="text-[11px] leading-snug text-slate-400/80">
          Comprobantes internos sin validez fiscal
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar fijo en escritorio */}
      <aside className="hidden lg:block w-60 shrink-0 fixed inset-y-0 left-0 z-30 no-print">
        {sidebarContent}
      </aside>

      {/* Drawer móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[82vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Columna principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        {/* Barra superior */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-card/95 backdrop-blur px-4 sm:px-6 no-print">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/perfil"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-muted/70 transition-colors"
              title="Mi perfil y contraseña"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-[#e2f2f3] text-xs font-semibold text-[#0f6c74]">
                {getIniciales(user.nombre)}
              </span>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-sm font-medium text-foreground">
                  {user.nombre}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {ROLES_LABELS[user.rol]}
                </span>
              </div>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Salir"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
