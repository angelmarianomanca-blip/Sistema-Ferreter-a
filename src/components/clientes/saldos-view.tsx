"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Paginador } from "@/components/shared/paginator";
import { EstadoVacio } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoneda } from "@/lib/format";
import type { ListarClientesResult } from "@/services/clientes.service";

export function SaldosView({ resultado }: { resultado: ListarClientesResult }) {
  const totalAdeudado = resultado.totalAdeudado ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref="/clientes"
        volverTexto="Clientes"
        titulo="Saldos de cuentas corrientes"
        subtitulo={`${resultado.total} ${resultado.total === 1 ? "cliente adeuda" : "clientes adeudan"} ${formatMoneda(totalAdeudado)}`}
        acciones={
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
        }
      />

      <Card className="print-sheet">
        {resultado.data.length === 0 ? (
          <EstadoVacio
            titulo="No hay saldos pendientes"
            descripcion="Ningún cliente registra deuda en cuenta corriente en este momento."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Límite</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.map((c, idx) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {(resultado.page - 1) * resultado.pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clientes/${c.id}?tab=cuenta`}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      {c.nombre}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.tipoDoc} {c.nroDoc}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.limiteCredito !== null
                      ? formatMoneda(c.limiteCredito)
                      : "Sin límite"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600 tabular-nums">
                    {formatMoneda(c.saldo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-semibold text-foreground">
                  Total adeudado
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-foreground">
                  {formatMoneda(totalAdeudado)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}

        <Paginador
          page={resultado.page}
          pageSize={resultado.pageSize}
          total={resultado.total}
          etiqueta="clientes"
        />
      </Card>
    </div>
  );
}
