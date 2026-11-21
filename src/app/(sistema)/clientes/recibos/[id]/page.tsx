import { notFound } from "next/navigation";
import { ReciboView } from "@/components/clientes/recibo-view";
import { requirePageUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseIdParam } from "@/lib/http";
import { obtenerPago } from "@/services/pagos.service";

export const dynamic = "force-dynamic";

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id: rawId } = await params;

  let id: number;
  try {
    id = parseIdParam(rawId, "Recibo");
  } catch {
    notFound();
  }

  let pago;
  try {
    pago = await obtenerPago(user, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <ReciboView pago={pago} />;
}
