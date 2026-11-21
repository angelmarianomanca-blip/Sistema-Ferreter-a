import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requirePageUser } from "@/lib/auth";
import { contarBajoMinimo } from "@/services/productos.service";

export const dynamic = "force-dynamic";

export default async function SistemaLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requirePageUser();
  const bajoMinimoCount = await contarBajoMinimo(user);

  return (
    <AppShell user={user} bajoMinimoCount={bajoMinimoCount}>
      {children}
    </AppShell>
  );
}
