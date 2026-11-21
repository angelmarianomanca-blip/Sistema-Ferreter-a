import { FacturasView } from "@/components/ventas/facturas-view";
import { requirePageUser } from "@/lib/auth";
import { listarClientes } from "@/services/clientes.service";
import { listarFacturas } from "@/services/facturas.service";
import { listarVendedoresParaFiltro } from "@/services/usuarios.service";

export const dynamic = "force-dynamic";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = str("q");
  const desde = str("desde");
  const hasta = str("hasta");
  const clienteId = str("clienteId");
  const vendedorId = str("vendedorId");
  const forma = str("forma");
  const estado = str("estado");
  const page = Number(str("page")) || 1;

  const [resultado, clientesRes, vendedores] = await Promise.all([
    listarFacturas(user, {
      q: q || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      clienteId: clienteId || undefined,
      vendedorId: vendedorId || undefined,
      forma: forma || undefined,
      estado: estado || undefined,
      page,
      pageSize: 20,
    }),
    listarClientes(user, { activo: "todos", page: 1, pageSize: 100 }),
    listarVendedoresParaFiltro(user),
  ]);

  return (
    <FacturasView
      resultado={resultado}
      clientes={clientesRes.data.map((c) => ({ id: c.id, nombre: c.nombre }))}
      vendedores={vendedores}
      filtros={{ q, desde, hasta, clienteId, vendedorId, forma, estado }}
    />
  );
}
