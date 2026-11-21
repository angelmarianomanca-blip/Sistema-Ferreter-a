import { redirect } from "next/navigation";
import { UsuariosView } from "@/components/usuarios/usuarios-view";
import { requirePageUser } from "@/lib/auth";
import { listarUsuarios } from "@/services/usuarios.service";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  if (user.rol !== "admin") {
    redirect("/");
  }

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const activo = typeof sp.activo === "string" ? sp.activo : "";
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const usuariosPage = await listarUsuarios(user, {
    q: q || undefined,
    activo: activo || "todos",
    page,
    pageSize: 20,
  });

  return (
    <UsuariosView
      currentUserId={user.id}
      usuariosPage={usuariosPage}
      filtros={{ q, activo }}
    />
  );
}
