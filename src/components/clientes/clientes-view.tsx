"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search, Wallet } from "lucide-react";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaActivo,
  InsigniaCuentaCorriente,
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
import { formatMoneda } from "@/lib/format";
import type { PaginatedResponse } from "@/lib/schemas/common";
import type { ClienteDTO } from "@/services/clientes.service";
import { ClienteFormDialog } from "./cliente-dialogs";

export function ClientesView({
  totalAdeudado,
  clientesPage,
  filtros,
}: {
  totalAdeudado: number;
  clientesPage: PaginatedResponse<ClienteDTO>;
  filtros: { q: string; activo: string; conDeuda: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(filtros.q);
  const [nuevoOpen, setNuevoOpen] = useState(false);

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
        titulo="Clientes"
        subtitulo={`${formatMoneda(totalAdeudado)} adeudados en cuentas corrientes`}
        acciones={
          <>
            <Button variant="outline" asChild>
              <Link href="/clientes/saldos">
                <Wallet className="size-4" />
                Saldos
              </Link>
            </Button>
            <Button type="button" onClick={() => setNuevoOpen(true)}>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80">
          <div className="relative flex-1 min-w-[210px] max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Nombre, DNI o CUIT"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filtros.activo || "true"}
            onValueChange={(v) =>
              updateParams({ activo: v === "true" ? null : v, page: null })
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

          <div className="flex items-center gap-2 pl-1">
            <Switch
              id="solo-con-deuda"
              checked={filtros.conDeuda}
              onCheckedChange={(checked) =>
                updateParams({
                  conDeuda: checked ? "true" : null,
                  page: null,
                })
              }
            />
            <Label
              htmlFor="solo-con-deuda"
              className="text-sm font-normal cursor-pointer"
            >
              Solo con deuda
            </Label>
          </div>
        </div>

        {clientesPage.data.length === 0 ? (
          <EstadoVacio
            titulo="No encontramos clientes"
            descripcion="Probá cambiando la búsqueda o creá un cliente nuevo."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Documento</TableHead>
                <TableHead>Nombre o razón social</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesPage.data.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => router.push(`/clientes/${c.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap">
                    <span className="text-xs text-muted-foreground mr-1.5">
                      {c.tipoDoc}
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {c.nroDoc}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{c.nombre}</span>
                      {!c.activo && <InsigniaActivo activo={false} />}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.telefono ?? "—"}
                  </TableCell>
                  <TableCell>
                    {c.cuentaCorriente ? <InsigniaCuentaCorriente /> : null}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      c.saldo > 0 ? "text-red-600" : "text-foreground"
                    }`}
                  >
                    {formatMoneda(c.saldo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Paginador
          page={clientesPage.page}
          pageSize={clientesPage.pageSize}
          total={clientesPage.total}
          etiqueta="clientes"
        />
      </Card>

      <ClienteFormDialog open={nuevoOpen} onOpenChange={setNuevoOpen} />
    </div>
  );
}
