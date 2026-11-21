import { ProductosView } from "@/components/productos/productos-view";
import { requirePageUser } from "@/lib/auth";
import { listarCategorias } from "@/services/categorias.service";
import { listarProductos } from "@/services/productos.service";
import { listarMovimientosStock } from "@/services/stock.service";

export const dynamic = "force-dynamic";

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const sp = await searchParams;

  const str = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : "";
  };

  const tabActiva = str("tab") === "movimientos" ? "movimientos" : "catalogo";
  const page = Number(str("page")) || 1;
  const q = str("q");
  const categoriaId = str("categoriaId");
  const activo = str("activo");
  const bajoMinimo = str("bajoMinimo") === "true";
  const tipo = str("tipo");
  const desde = str("desde");
  const hasta = str("hasta");

  const [categorias, productosPage, activosCountPage, productosSelectPage, movimientosPage] =
    await Promise.all([
      listarCategorias(user),
      listarProductos(user, {
        q: q || undefined,
        categoriaId: categoriaId || undefined,
        bajoMinimo: bajoMinimo ? "true" : undefined,
        activo: activo || "true",
        page: tabActiva === "catalogo" ? page : 1,
        pageSize: 20,
      }),
      listarProductos(user, { activo: "true", page: 1, pageSize: 1 }),
      user.rol === "admin"
        ? listarProductos(user, { activo: "true", page: 1, pageSize: 100 })
        : Promise.resolve({ data: [], page: 1, pageSize: 100, total: 0 }),
      listarMovimientosStock(user, {
        tipo: tipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: tabActiva === "movimientos" ? page : 1,
        pageSize: 20,
      }),
    ]);

  return (
    <ProductosView
      esAdmin={user.rol === "admin"}
      tabActiva={tabActiva}
      totalActivos={activosCountPage.total}
      categorias={categorias}
      productosPage={productosPage}
      productosSelect={productosSelectPage.data.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        existencia: p.existencia,
      }))}
      movimientosPage={movimientosPage}
      filtros={{ q, categoriaId, activo, bajoMinimo, tipo, desde, hasta }}
    />
  );
}
