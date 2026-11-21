"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaActivo,
  InsigniaBajoMinimo,
  InsigniaTipoMovimiento,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFecha, formatHora, formatMoneda } from "@/lib/format";
import type { PaginatedResponse } from "@/lib/schemas/common";
import type { CategoriaDTO } from "@/services/categorias.service";
import type { ProductoDTO } from "@/services/productos.service";
import type { MovimientoStockDTO } from "@/services/stock.service";
import {
  MovimientoStockDialog,
  ProductoFormDialog,
} from "./producto-dialogs";

export function ProductosView({
  esAdmin,
  tabActiva,
  totalActivos,
  categorias,
  productosPage,
  productosSelect,
  movimientosPage,
  filtros,
}: {
  esAdmin: boolean;
  tabActiva: "catalogo" | "movimientos";
  totalActivos: number;
  categorias: CategoriaDTO[];
  productosPage: PaginatedResponse<ProductoDTO>;
  productosSelect: Array<{
    id: number;
    codigo: string;
    descripcion: string;
    existencia: number;
  }>;
  movimientosPage: PaginatedResponse<MovimientoStockDTO>;
  filtros: {
    q: string;
    categoriaId: string;
    activo: string;
    bajoMinimo: boolean;
    tipo: string;
    desde: string;
    hasta: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(filtros.q);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [movOpen, setMovOpen] = useState<"ingreso" | "egreso" | null>(null);

  useEffect(() => {
    setSearchText(filtros.q);
  }, [filtros.q]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (searchText === filtros.q) return;
    const t = setTimeout(() => {
      updateParams({ q: searchText.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Productos"
        subtitulo={`${totalActivos} ${totalActivos === 1 ? "producto activo" : "productos activos"} en el catálogo`}
        acciones={
          <>
            <Button variant="ghost" asChild>
              <Link href="/productos/categorias">
                <Tag className="size-4" />
                Categorías
              </Link>
            </Button>
            {esAdmin && (
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
                <Button type="button" onClick={() => setNuevoOpen(true)}>
                  <Plus className="size-4" />
                  Nuevo producto
                </Button>
              </>
            )}
          </>
        }
      />

      <Tabs
        value={tabActiva}
        onValueChange={(v) =>
          updateParams({
            tab: v === "movimientos" ? "movimientos" : null,
            page: null,
          })
        }
      >
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="movimientos">Existencias y movimientos</TabsTrigger>
        </TabsList>

        {/* PESTAÑA CATÁLOGO */}
        <TabsContent value="catalogo">
          <Card>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80">
              <div className="relative flex-1 min-w-[210px] max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Código o descripción"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={filtros.categoriaId || "todas"}
                onValueChange={(v) =>
                  updateParams({
                    categoriaId: v === "todas" ? null : v,
                    page: null,
                  })
                }
              >
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {esAdmin && (
                <Select
                  value={filtros.activo || "true"}
                  onValueChange={(v) =>
                    updateParams({
                      activo: v === "true" ? null : v,
                      page: null,
                    })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activos</SelectItem>
                    <SelectItem value="false">Inactivos</SelectItem>
                    <SelectItem value="todos">Todos</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2 pl-1">
                <Switch
                  id="solo-bajo-minimo"
                  checked={filtros.bajoMinimo}
                  onCheckedChange={(checked) =>
                    updateParams({
                      bajoMinimo: checked ? "true" : null,
                      page: null,
                    })
                  }
                />
                <Label
                  htmlFor="solo-bajo-minimo"
                  className="text-sm font-normal cursor-pointer"
                >
                  Solo bajo mínimo
                </Label>
              </div>
            </div>

            {productosPage.data.length === 0 ? (
              <EstadoVacio
                titulo="No encontramos productos"
                descripcion="Probá cambiando la búsqueda o limpiando los filtros."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Existencia</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosPage.data.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => router.push(`/productos/${p.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.codigo}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{p.descripcion}</span>
                          {!p.activo && <InsigniaActivo activo={false} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.categoria.nombre}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoneda(p.precio)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.bajoMinimo && p.activo ? (
                          <InsigniaBajoMinimo existencia={p.existencia} />
                        ) : (
                          <span className="font-medium">{p.existencia}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {p.stockMinimo}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Paginador
              page={productosPage.page}
              pageSize={productosPage.pageSize}
              total={productosPage.total}
              etiqueta="productos"
            />
          </Card>
        </TabsContent>

        {/* PESTAÑA EXISTENCIAS Y MOVIMIENTOS */}
        <TabsContent value="movimientos">
          <Card>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80">
              <Select
                value={filtros.tipo || "todos"}
                onValueChange={(v) =>
                  updateParams({
                    tipo: v === "todos" ? null : v,
                    page: null,
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="anulacion">Anulación</SelectItem>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="egreso">Egreso</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Label htmlFor="mov-desde" className="text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="mov-desde"
                  type="date"
                  value={filtros.desde}
                  onChange={(e) =>
                    updateParams({ desde: e.target.value || null, page: null })
                  }
                  className="w-[155px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="mov-hasta" className="text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="mov-hasta"
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) =>
                    updateParams({ hasta: e.target.value || null, page: null })
                  }
                  className="w-[155px]"
                />
              </div>
            </div>

            {movimientosPage.data.length === 0 ? (
              <EstadoVacio
                titulo="No hay movimientos para estos filtros"
                descripcion="Cuando haya ventas, ingresos o egresos aparecerán en este historial."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Existencia</TableHead>
                    <TableHead>Motivo / referencia</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientosPage.data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        <span>{formatFecha(m.fecha)}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {formatHora(m.fecha)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/productos/${m.producto.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <span className="font-mono text-xs text-muted-foreground mr-2">
                            {m.producto.codigo}
                          </span>
                          <span className="font-medium">
                            {m.producto.descripcion}
                          </span>
                        </Link>
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
              page={movimientosPage.page}
              pageSize={movimientosPage.pageSize}
              total={movimientosPage.total}
              etiqueta="movimientos"
            />
          </Card>
        </TabsContent>
      </Tabs>

      {esAdmin && (
        <>
          <ProductoFormDialog
            open={nuevoOpen}
            onOpenChange={setNuevoOpen}
            categorias={categorias}
          />
          {movOpen && (
            <MovimientoStockDialog
              open={Boolean(movOpen)}
              onOpenChange={(o) => {
                if (!o) setMovOpen(null);
              }}
              tipo={movOpen}
              productos={productosSelect}
            />
          )}
        </>
      )}
    </div>
  );
}
