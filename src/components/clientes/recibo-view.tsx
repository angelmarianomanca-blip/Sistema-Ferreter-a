"use client";

import { Printer } from "lucide-react";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { COMERCIO, MEDIOS_PAGO_LABELS } from "@/lib/constants";
import { formatFechaHora, formatMoneda } from "@/lib/format";
import type { PagoDTO } from "@/services/pagos.service";

export function ReciboView({ pago }: { pago: PagoDTO }) {
  const numeroSinPrefijo = pago.numeroRecibo.replace(/^R\s+/, "");

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref={`/clientes/${pago.cliente.id}?tab=cuenta`}
        volverTexto={pago.cliente.nombre}
        titulo={`Recibo ${pago.numeroRecibo}`}
        acciones={
          <Button type="button" onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimir
          </Button>
        }
      />

      <Card className="max-w-3xl w-full mx-auto print-sheet">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Encabezado comercio y número */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-bold text-foreground">
                {COMERCIO.nombre}
              </p>
              <p className="text-xs text-muted-foreground">
                {COMERCIO.domicilio}
              </p>
              <p className="text-xs text-muted-foreground">
                CUIT {COMERCIO.cuit} · Tel. {COMERCIO.telefono}
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <Badge variant="teal" className="uppercase tracking-wider">
                Recibo
              </Badge>
              <p className="text-base font-bold font-mono text-foreground">
                N° {numeroSinPrefijo}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatFechaHora(pago.fecha)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Cliente y usuario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Recibimos de</p>
              <p className="font-semibold text-foreground mt-0.5">
                {pago.cliente.nombre}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {pago.cliente.tipoDoc} {pago.cliente.nroDoc}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atendió</p>
              <p className="font-semibold text-foreground mt-0.5">
                {pago.usuario.nombre}
              </p>
            </div>
          </div>

          {/* Detalle del pago */}
          <div className="rounded-xl bg-muted/45 border border-border/70 p-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Concepto</span>
              <span className="font-medium text-foreground">
                Pago a cuenta corriente
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Medio</span>
              <span className="font-medium text-foreground">
                {MEDIOS_PAGO_LABELS[pago.medio]}
              </span>
            </div>
            {pago.observacion && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Observación</span>
                <span className="font-medium text-foreground text-right">
                  {pago.observacion}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex items-baseline justify-between gap-4 pt-1">
              <span className="font-semibold text-foreground">
                Importe recibido
              </span>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatMoneda(pago.importe)}
              </span>
            </div>
          </div>

          <div className="text-right text-sm">
            <span className="text-muted-foreground">
              Saldo actual de la cuenta:{" "}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatMoneda(pago.saldoCliente)}
            </span>
          </div>

          <Separator />

          <p className="text-center text-xs text-muted-foreground">
            Comprobante interno sin validez fiscal · Precios finales con
            impuestos incluidos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
