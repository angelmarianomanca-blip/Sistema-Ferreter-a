"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Printer } from "lucide-react";
import { anularFacturaAction } from "@/actions/gestion.actions";
import { CampoFormulario } from "@/components/shared/form-field";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { InsigniaEstadoFactura } from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import {
  COMERCIO,
  FORMAS_PAGO_LABELS,
  TARJETA_TIPO_LABELS,
} from "@/lib/constants";
import {
  formatFecha,
  formatFechaHora,
  formatHora,
  formatMoneda,
} from "@/lib/format";
import { anularFacturaSchema } from "@/lib/schemas/facturas";
import type { FacturaDetalleDTO } from "@/services/facturas.service";

export function ComprobanteView({
  esAdmin,
  factura,
}: {
  esAdmin: boolean;
  factura: FacturaDetalleDTO;
}) {
  const router = useRouter();
  const [anularOpen, setAnularOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: anularFacturaSchema,
    action: (data) => anularFacturaAction(factura.id, data),
    successMessage: "Factura anulada. Se revirtió el stock y el saldo.",
    onSuccess: () => {
      setAnularOpen(false);
      setMotivo("");
      router.refresh();
    },
  });

  async function handleAnular(e: React.FormEvent) {
    e.preventDefault();
    await submit({ motivo });
  }

  const esAnulada = factura.estado === "anulada";

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref="/ventas"
        volverTexto="Facturas"
        titulo={`Factura ${factura.numeroFormateado}`}
        badge={<InsigniaEstadoFactura estado={factura.estado} />}
        acciones={
          <>
            {esAdmin && !esAnulada && (
              <Button
                type="button"
                variant="destructive-soft"
                onClick={() => setAnularOpen(true)}
              >
                <Ban className="size-4" />
                Anular
              </Button>
            )}
            <Button type="button" onClick={() => window.print()}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          </>
        }
      />

      <Card className="relative max-w-3xl w-full mx-auto overflow-hidden print-sheet">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Sello ANULADA */}
          {esAnulada && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10">
              <div className="-rotate-12 rounded-xl border-4 border-red-500/35 px-6 py-1.5 text-3xl sm:text-4xl font-extrabold tracking-[0.2em] text-red-600/35 uppercase select-none">
                Anulada
              </div>
            </div>
          )}

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
                Factura
              </Badge>
              <p className="text-base font-bold font-mono text-foreground">
                N° {factura.numeroFormateado}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatFechaHora(factura.fecha)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Cliente y vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              {factura.cliente ? (
                <>
                  <Link
                    href={`/clientes/${factura.cliente.id}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors mt-0.5 inline-block"
                  >
                    {factura.cliente.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">
                      {factura.cliente.tipoDoc} {factura.cliente.nroDoc}
                    </span>
                    {factura.cliente.domicilio
                      ? ` · ${factura.cliente.domicilio}`
                      : ""}
                  </p>
                </>
              ) : (
                <p className="font-semibold text-foreground mt-0.5">
                  Consumidor final
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Vendedor</p>
              <p className="font-semibold text-foreground mt-0.5">
                {factura.vendedor.nombre}
              </p>
            </div>
          </div>

          {/* Detalle de renglones */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-muted/35 text-xs text-muted-foreground">
                  <th className="py-2.5 px-3 text-left font-semibold">Código</th>
                  <th className="py-2.5 px-3 text-left font-semibold">
                    Descripción
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">
                    Cant.
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">
                    P. unit.
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {factura.items.map((it) => (
                  <tr key={it.productoId}>
                    <td className="py-3 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {it.codigo}
                    </td>
                    <td className="py-3 px-3 font-medium text-foreground">
                      {it.descripcion}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {it.cantidad}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      {formatMoneda(it.precioUnitario)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold tabular-nums whitespace-nowrap">
                      {formatMoneda(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Forma de pago y Total */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <div className="text-sm space-y-0.5">
              <p className="text-xs text-muted-foreground">Forma de pago</p>
              <p className="font-medium text-foreground">
                {FORMAS_PAGO_LABELS[factura.pago.forma]}
              </p>
              {factura.pago.forma === "contado" && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  Recibido: {formatMoneda(factura.pago.montoRecibido)} · Vuelto:{" "}
                  {formatMoneda(factura.pago.vuelto)}
                </p>
              )}
              {factura.pago.forma === "tarjeta" && (
                <p className="text-xs text-muted-foreground">
                  {TARJETA_TIPO_LABELS[factura.pago.tarjeta.tipo]} ·{" "}
                  {factura.pago.tarjeta.marca} terminada en{" "}
                  <span className="font-mono">
                    {factura.pago.tarjeta.ultimos4}
                  </span>
                </p>
              )}
              {factura.pago.forma === "cuenta_corriente" &&
                factura.saldoCliente !== undefined && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Saldo actual de la cuenta:{" "}
                    {formatMoneda(factura.saldoCliente)}
                  </p>
                )}
            </div>

            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p
                className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
                  esAnulada
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {formatMoneda(factura.total)}
              </p>
            </div>
          </div>

          {/* Detalle de anulación */}
          {esAnulada && factura.anulacion && (
            <div className="rounded-lg border border-red-200 bg-red-50/70 px-4 py-3 text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Anulada el {formatFecha(factura.anulacion.fecha)} a las{" "}
                {formatHora(factura.anulacion.fecha)} por{" "}
                {factura.anulacion.usuario.nombre}
              </p>
              <p>Motivo: {factura.anulacion.motivo}</p>
            </div>
          )}

          <Separator />

          <p className="text-center text-xs text-muted-foreground">
            Comprobante interno sin validez fiscal · Precios finales con
            impuestos incluidos
          </p>
        </CardContent>
      </Card>

      {/* Modal Anular factura (solo admin) */}
      {esAdmin && !esAnulada && (
        <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Anular factura {factura.numeroFormateado}
              </DialogTitle>
              <DialogDescription>
                Se reingresa el stock de {factura.items.length}{" "}
                {factura.items.length === 1 ? "renglón" : "renglones"}
                {factura.pago.forma === "cuenta_corriente"
                  ? " y se acredita el total en la cuenta corriente del cliente"
                  : ""}
                . La factura no se borra: queda visible como anulada.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAnular} className="space-y-4" noValidate>
              <CampoFormulario
                id="anul-motivo"
                label="Motivo"
                error={fieldErrors.motivo}
              >
                <Textarea
                  id="anul-motivo"
                  placeholder="Por ejemplo: error en la carga de cantidades"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    clearError("motivo");
                  }}
                  aria-invalid={Boolean(fieldErrors.motivo)}
                />
              </CampoFormulario>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAnularOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive-soft"
                  disabled={submitting}
                >
                  {submitting ? "Anulando..." : "Anular factura"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
