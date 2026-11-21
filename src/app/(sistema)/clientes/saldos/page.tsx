import { SaldosView } from "@/components/clientes/saldos-view";
import { requirePageUser } from "@/lib/auth";
import { listarClientes } from "@/services/clientes.service";

export const dynamic = "force-dynamic";

export default async function SaldosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  const resultado = await listarClientes(user, {
    conDeuda: "true",
    orden: "saldo",
    activo: "todos",
    page,
    pageSize: 50,
  });

  return <SaldosView resultado={resultado} />;
}
