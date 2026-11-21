import Link from "next/link";
import { Plus } from "lucide-react";
import { Apilar } from "@/components/layout/primitives";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { TableroGraficos } from "@/components/tablero/tablero-graficos";
import {
  TableroIndicadores,
  TableroPanelInferior,
} from "@/components/tablero/tablero-secciones";
import { Button } from "@/components/ui/button";
import { requirePageUser } from "@/lib/auth";
import { formatFechaLarga } from "@/lib/format";
import { listarProductos } from "@/services/productos.service";
import { obtenerTablero } from "@/services/tablero.service";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const user = await requirePageUser();
  const [tablero, paraReponer] = await Promise.all([
    obtenerTablero(user),
    listarProductos(user, { bajoMinimo: "true", page: 1, pageSize: 6 }),
  ]);

  const primerNombre = user.nombre.split(" ")[0] || user.nombre;

  return (
    <Apilar gap="lg">
      <EncabezadoPagina
        titulo={`Hola, ${primerNombre}`}
        subtitulo={formatFechaLarga()}
        acciones={
          <Button asChild>
            <Link href="/ventas/nueva">
              <Plus className="size-4" />
              Nueva venta
            </Link>
          </Button>
        }
      />

      <TableroIndicadores tablero={tablero} />

      <TableroGraficos
        ventasDiarias={tablero.ventasDiarias}
        porFormaDePago={tablero.porFormaDePago}
      />

      <TableroPanelInferior
        masVendidos={tablero.masVendidos}
        paraReponer={paraReponer.data}
      />
    </Apilar>
  );
}
