import { notFound } from "next/navigation";
import { FichaClienteView } from "@/components/clientes/ficha-cliente-view";
import { requirePageUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseIdParam } from "@/lib/http";
import {
  obtenerCliente,
  obtenerCuentaCorriente,
} from "@/services/clientes.service";

export const dynamic = "force-dynamic";

export default async function FichaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const { id: rawId } = await params;
  const sp = await searchParams;

  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const tabActiva = str("tab") === "cuenta" ? "cuenta" : "datos";
  const desde = str("desde");
  const hasta = str("hasta");

  let id: number;
  try {
    id = parseIdParam(rawId, "Cliente");
  } catch {
    notFound();
  }

  let cliente;
  try {
    cliente = await obtenerCliente(user, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const cuenta = await obtenerCuentaCorriente(user, id, {
    desde: desde || undefined,
    hasta: hasta || undefined,
  });

  return (
    <FichaClienteView
      cliente={cliente}
      cuenta={cuenta}
      tabActiva={tabActiva}
      filtros={{ desde, hasta }}
    />
  );
}
