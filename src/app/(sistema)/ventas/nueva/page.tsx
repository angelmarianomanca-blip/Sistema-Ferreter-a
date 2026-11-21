import { NuevaVentaView } from "@/components/ventas/nueva-venta-view";
import { requirePageUser } from "@/lib/auth";
import { obtenerProximoNumero } from "@/services/facturas.service";

export const dynamic = "force-dynamic";

export default async function NuevaVentaPage() {
  const user = await requirePageUser();
  const { numeroFormateado } = await obtenerProximoNumero(user);

  return <NuevaVentaView vendedor={user} proximoNumero={numeroFormateado} />;
}
