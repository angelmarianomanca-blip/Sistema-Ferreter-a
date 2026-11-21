import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { InsigniaBajoMinimo } from "@/components/shared/status-badges";
import { EstadoVacio } from "@/components/shared/states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoneda, formatNombreMes } from "@/lib/format";
import type { ProductoDTO } from "@/services/productos.service";
import type { TableroDTO } from "@/services/tablero.service";

export function TableroIndicadores({ tablero }: { tablero: TableroDTO }) {
  const mesNombre = formatNombreMes();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Ventas de hoy</span>
            <TrendingUp className="size-4 text-muted-foreground/80" />
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {formatMoneda(tablero.hoy.importe)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tablero.hoy.cantidad}{" "}
            {tablero.hoy.cantidad === 1 ? "factura" : "facturas"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Ventas de {mesNombre}</span>
            <CalendarDays className="size-4 text-muted-foreground/80" />
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
            {formatMoneda(tablero.mes.importe)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {tablero.mes.cantidad}{" "}
            {tablero.mes.cantidad === 1 ? "factura" : "facturas"} · ticket
            promedio {formatMoneda(tablero.mes.ticketPromedio)}
          </p>
        </CardContent>
      </Card>

      <Link href="/clientes/saldos" className="block group">
        <Card className="h-full transition-colors group-hover:border-primary/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Deuda en cuentas corrientes</span>
              <Wallet className="size-4 text-muted-foreground/80" />
            </div>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {formatMoneda(tablero.cuentasCorrientes.totalAdeudado)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tablero.cuentasCorrientes.clientesConSaldo}{" "}
              {tablero.cuentasCorrientes.clientesConSaldo === 1
                ? "cliente con saldo"
                : "clientes con saldo"}
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/productos?bajoMinimo=true" className="block group">
        <Card
          className={
            tablero.bajoMinimo.cantidad > 0
              ? "h-full bg-amber-50/50 border-amber-200/80 transition-colors group-hover:border-amber-300"
              : "h-full transition-colors group-hover:border-primary/40"
          }
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Bajo stock mínimo</span>
              <AlertTriangle
                className={
                  tablero.bajoMinimo.cantidad > 0
                    ? "size-4 text-amber-600"
                    : "size-4 text-muted-foreground/80"
                }
              />
            </div>
            <p className="mt-2.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {tablero.bajoMinimo.cantidad}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Productos para reponer
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export function TableroPanelInferior({
  masVendidos,
  paraReponer,
}: {
  masVendidos: TableroDTO["masVendidos"];
  paraReponer: ProductoDTO[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle>Más vendidos del mes</CardTitle>
          <CardDescription>Por unidades</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {masVendidos.length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay ventas este mes"
              descripcion="A medida que emitas facturas aparecerán los productos más vendidos."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masVendidos.map((item, idx) => (
                  <TableRow key={item.productoId}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/productos/${item.productoId}`}
                        className="group block"
                      >
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {item.descripcion}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {item.codigo}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {item.unidades}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoneda(item.importe)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle>Para reponer</CardTitle>
            <CardDescription>Productos bajo el stock mínimo</CardDescription>
          </div>
          <Link
            href="/productos?bajoMinimo=true"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors shrink-0 pt-0.5"
          >
            <span>Ver todos</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {paraReponer.length === 0 ? (
            <EstadoVacio
              titulo="Stock al día"
              descripcion="No hay productos por debajo del stock mínimo."
            />
          ) : (
            <div className="divide-y divide-border/70">
              {paraReponer.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/productos/${prod.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/35 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {prod.descripcion}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {prod.codigo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <InsigniaBajoMinimo existencia={prod.existencia} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      mínimo {prod.stockMinimo}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
