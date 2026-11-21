import { ClientesView } from "@/components/clientes/clientes-view";
import { requirePageUser } from "@/lib/auth";
import {
  listarClientes,
  obtenerResumenDeudaClientes,
} from "@/services/clientes.service";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const q = str("q");
  const activo = str("activo");
  const conDeuda = str("conDeuda") === "true";
  const page = Number(str("page")) || 1;

  const [resumen, clientesPage] = await Promise.all([
    obtenerResumenDeudaClientes(user),
    listarClientes(user, {
      q: q || undefined,
      activo: activo || "true",
      conDeuda: conDeuda ? "true" : undefined,
      orden: conDeuda ? "saldo" : "nombre",
      page,
      pageSize: 20,
    }),
  ]);

  return (
    <ClientesView
      totalAdeudado={resumen.totalAdeudado}
      clientesPage={clientesPage}
      filtros={{ q, activo, conDeuda }}
    />
  );
}
