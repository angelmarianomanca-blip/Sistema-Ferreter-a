import { notFound } from "next/navigation";
import { ComprobanteView } from "@/components/ventas/comprobante-view";
import { requirePageUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseIdParam } from "@/lib/http";
import { obtenerFactura } from "@/services/facturas.service";

export const dynamic = "force-dynamic";

export default async function DetalleFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id: rawId } = await params;

  let id: number;
  try {
    id = parseIdParam(rawId, "Factura");
  } catch {
    notFound();
  }

  let factura;
  try {
    factura = await obtenerFactura(user, id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <ComprobanteView esAdmin={user.rol === "admin"} factura={factura} />
  );
}
