"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaEstadoFactura,
  InsigniaFormaPago,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFecha, formatHora, formatMoneda } from "@/lib/format";
import type { ListarFacturasResult } from "@/services/facturas.service";

export function FacturasView({
  resultado,
  clientes,
  vendedores,
  filtros,
}: {
  resultado: ListarFacturasResult;
  clientes: Array<{ id: number; nombre: string }>;
  vendedores: Array<{ id: number; nombre: string }>;
  filtros: {
    q: string;
    desde: string;
    hasta: string;
    clienteId: string;
    vendedorId: string;
    forma: string;
    estado: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(filtros.q);

  useEffect(() => {
    setSearchText(filtros.q);
  }, [filtros.q]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
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
        titulo="Facturas"
        subtitulo={`${resultado.total} ${resultado.total === 1 ? "comprobante" : "comprobantes"} · ${formatMoneda(resultado.totalEmitido)} emitidos con estos filtros`}
        acciones={
          <Button asChild>
            <Link href="/ventas/nueva">
              <Plus className="size-4" />
              Nueva venta
            </Link>
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 p-4 border-b border-border/80">
          {/* Fila 1: búsqueda y fechas */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Número o cliente"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="fac-desde" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input
                id="fac-desde"
                type="date"
                value={filtros.desde}
                onChange={(e) =>
                  updateParams({ desde: e.target.value || null, page: null })
                }
                className="w-[155px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="fac-hasta" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="fac-hasta"
                type="date"
                value={filtros.hasta}
                onChange={(e) =>
                  updateParams({ hasta: e.target.value || null, page: null })
                }
                className="w-[155px]"
              />
            </div>
          </div>

          {/* Fila 2: selects */}
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filtros.clienteId || "todos"}
              onValueChange={(v) =>
                updateParams({ clienteId: v === "todos" ? null : v, page: null })
              }
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtros.forma || "todas"}
              onValueChange={(v) =>
                updateParams({ forma: v === "todas" ? null : v, page: null })
              }
            >
              <SelectTrigger className="w-[195px]">
                <SelectValue placeholder="Todas las formas de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las formas de pago</SelectItem>
                <SelectItem value="contado">Contado</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="cuenta_corriente">Cuenta corriente</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtros.vendedorId || "todos"}
              onValueChange={(v) =>
                updateParams({ vendedorId: v === "todos" ? null : v, page: null })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos los vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los vendedores</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtros.estado || "todos"}
              onValueChange={(v) =>
                updateParams({ estado: v === "todos" ? null : v, page: null })
              }
            >
              <SelectTrigger className="w-[165px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="emitida">Emitidas</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {resultado.data.length === 0 ? (
          <EstadoVacio
            titulo="No encontramos facturas"
            descripcion="Probá ajustando las fechas o limpiando alguno de los filtros."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Forma de pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.map((f) => (
                <TableRow
                  key={f.id}
                  onClick={() => router.push(`/ventas/${f.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                    {f.numeroFormateado}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <span>{formatFecha(f.fecha)}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {formatHora(f.fecha)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={
                      f.cliente ? "font-medium text-foreground" : "text-muted-foreground"
                    }
                  >
                    {f.cliente ? f.cliente.nombre : "Consumidor final"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.vendedor.nombre}
                  </TableCell>
                  <TableCell>
                    <InsigniaFormaPago forma={f.formaPago} />
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums whitespace-nowrap ${
                      f.estado === "anulada"
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {formatMoneda(f.total)}
                  </TableCell>
                  <TableCell>
                    <InsigniaEstadoFactura estado={f.estado} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Paginador
          page={resultado.page}
          pageSize={resultado.pageSize}
          total={resultado.total}
          etiqueta="facturas"
        />
      </Card>
    </div>
  );
}
