import { CategoriasView } from "@/components/productos/categorias-view";
import { requirePageUser } from "@/lib/auth";
import { listarCategorias } from "@/services/categorias.service";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const user = await requirePageUser();
  const categorias = await listarCategorias(user, {
    incluirInactivas: user.rol === "admin",
  });

  return (
    <CategoriasView esAdmin={user.rol === "admin"} categorias={categorias} />
  );
}
