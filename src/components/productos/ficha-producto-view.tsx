"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArchiveRestore,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { editarProductoAction } from "@/actions/productos.actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaActivo,
  InsigniaBajoMinimo,
  InsigniaTipoMovimiento,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha, formatHora, formatMoneda } from "@/lib/format";
import type { PaginatedResponse } from "@/lib/schemas/common";
import type { CategoriaDTO } from "@/services/categorias.service";
import type { ProductoDTO } from "@/services/productos.service";
import type { MovimientoStockDTO } from "@/services/stock.service";
import {
  MovimientoStockDialog,
  ProductoFormDialog,
} from "./producto-dialogs";

export function FichaProductoView({
  esAdmin,
  producto,
  categorias,
  movimientos,
}: {
  esAdmin: boolean;
  producto: ProductoDTO;
  categorias: CategoriaDTO[];
  movimientos: PaginatedResponse<MovimientoStockDTO>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [movOpen, setMovOpen] = useState<"ingreso" | "egreso" | null>(null);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggleActivo() {
    setToggling(true);
    const res = await editarProductoAction(producto.id, {
      activo: !producto.activo,
    });
    setToggling(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success(
      producto.activo
        ? "Producto dado de baja. Ya no se ofrecerá en ventas."
        : "Producto reactivado."
    );
    setBajaOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref="/productos"
        volverTexto="Productos"
        titulo={producto.descripcion}
        badge={!producto.activo ? <InsigniaActivo activo={false} /> : undefined}
        subtitulo={`${producto.codigo} · ${producto.categoria.nombre}`}
        acciones={
          esAdmin ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMovOpen("ingreso")}
              >
                <ArrowDownToLine className="size-4" />
                Ingreso
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMovOpen("egreso")}
              >
                <ArrowUpFromLine className="size-4" />
                Egreso
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBajaOpen(true)}
              >
                {producto.activo ? (
                  <>
                    <Trash2 className="size-4" />
                    Dar de baja
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="size-4" />
                    Reactivar
                  </>
                )}
              </Button>
            </>
          ) : undefined
        }
      />

      {/* 4 tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Existencia</p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {producto.existencia}
              </span>
              {producto.bajoMinimo && producto.activo && (
                <InsigniaBajoMinimo existencia={producto.existencia} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Stock mínimo</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {producto.stockMinimo}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Precio de venta</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatMoneda(producto.precio)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Valor del stock</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatMoneda(producto.existencia * producto.precio)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de movimientos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 py-4">
          <CardTitle className="text-sm">Movimientos de stock</CardTitle>
          <span className="text-xs text-muted-foreground">
            Del más nuevo al más viejo
          </span>
        </CardHeader>

        {movimientos.data.length === 0 ? (
          <EstadoVacio
            titulo="Sin movimientos registrados"
            descripcion="Este producto todavía no tiene ingresos, egresos ni ventas."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Existencia</TableHead>
                <TableHead>Motivo / referencia</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <span>{formatFecha(m.fecha)}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {formatHora(m.fecha)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <InsigniaTipoMovimiento tipo={m.tipo} />
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      m.cantidad > 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.existenciaResultante}
                  </TableCell>
                  <TableCell>
                    {m.referencia ? (
                      <Link
                        href={`/ventas/${m.referencia.facturaId}`}
                        className="text-primary hover:underline font-medium"
                      >
                        Factura {m.referencia.numero}
                      </Link>
                    ) : (
                      <span>
                        {m.motivo}
                        {m.observacion ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {m.observacion}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.usuario.nombre}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Paginador
          page={movimientos.page}
          pageSize={movimientos.pageSize}
          total={movimientos.total}
          etiqueta="movimientos"
        />
      </Card>

      {esAdmin && (
        <>
          <ProductoFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            categorias={categorias}
            producto={producto}
          />
          {movOpen && (
            <MovimientoStockDialog
              open={Boolean(movOpen)}
              onOpenChange={(o) => {
                if (!o) setMovOpen(null);
              }}
              tipo={movOpen}
              productoFijo={{
                id: producto.id,
                codigo: producto.codigo,
                descripcion: producto.descripcion,
                existencia: producto.existencia,
              }}
            />
          )}
          <ConfirmDialog
            open={bajaOpen}
            onOpenChange={setBajaOpen}
            titulo={
              producto.activo
                ? `¿Dar de baja "${producto.descripcion}"?`
                : `¿Reactivar "${producto.descripcion}"?`
            }
            descripcion={
              producto.activo
                ? "El producto quedará inactivo y dejará de ofrecerse en ventas, pero conservará todo su historial."
                : "El producto volverá a estar disponible en el catálogo y en ventas."
            }
            textoConfirmar={producto.activo ? "Dar de baja" : "Reactivar"}
            variante={producto.activo ? "destructive" : "default"}
            cargando={toggling}
            onConfirm={handleToggleActivo}
          />
        </>
      )}
    </div>
  );
}
