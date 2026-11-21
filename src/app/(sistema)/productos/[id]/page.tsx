import { notFound } from "next/navigation";
import { FichaProductoView } from "@/components/productos/ficha-producto-view";
import { requirePageUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseIdParam } from "@/lib/http";
import { listarCategorias } from "@/services/categorias.service";
import { obtenerProducto } from "@/services/productos.service";
import { listarMovimientosProducto } from "@/services/stock.service";

export const dynamic = "force-dynamic";

export default async function FichaProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const { id: rawId } = await params;
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  let id: number;
  try {
    id = parseIdParam(rawId, "Producto");
  } catch {
    notFound();
  }

  let producto;
  try {
    producto = await obtenerProducto(user, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [categorias, movimientos] = await Promise.all([
    listarCategorias(user),
    listarMovimientosProducto(user, id, { page, pageSize: 20 }),
  ]);

  return (
    <FichaProductoView
      esAdmin={user.rol === "admin"}
      producto={producto}
      categorias={categorias}
      movimientos={movimientos}
    />
  );
}
