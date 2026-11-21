"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArchiveRestore, Banknote, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { editarClienteAction } from "@/actions/clientes.actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { EstadoVacio } from "@/components/shared/states";
import {
  InsigniaActivo,
  InsigniaCuentaCorriente,
  InsigniaEstadoFactura,
  InsigniaFormaPago,
} from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFecha, formatHora, formatMoneda } from "@/lib/format";
import type {
  ClienteDetalleDTO,
  CuentaCorrienteDTO,
} from "@/services/clientes.service";
import { ClienteFormDialog, RegistrarPagoDialog } from "./cliente-dialogs";

export function FichaClienteView({
  cliente,
  cuenta,
  tabActiva,
  filtros,
}: {
  cliente: ClienteDetalleDTO;
  cuenta: CuentaCorrienteDTO;
  tabActiva: "datos" | "cuenta";
  filtros: { desde: string; hasta: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [editOpen, setEditOpen] = useState(false);
  const [pagoOpen, setPagoOpen] = useState(false);
  const [bajaOpen, setBajaOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleToggleActivo() {
    setToggling(true);
    const res = await editarClienteAction(cliente.id, {
      activo: !cliente.activo,
    });
    setToggling(false);
    if (!res.ok) {
      toast.error(res.error.message);
      setBajaOpen(false);
      return;
    }
    toast.success(
      cliente.activo ? "Cliente dado de baja." : "Cliente reactivado."
    );
    setBajaOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        volverHref="/clientes"
        volverTexto="Clientes"
        titulo={cliente.nombre}
        badge={
          <div className="flex items-center gap-1.5">
            {cliente.cuentaCorriente && <InsigniaCuentaCorriente />}
            {!cliente.activo && <InsigniaActivo activo={false} />}
          </div>
        }
        subtitulo={`${cliente.tipoDoc} ${cliente.nroDoc}`}
        acciones={
          <>
            {cliente.cuentaCorriente && cliente.saldo > 0 && (
              <Button type="button" onClick={() => setPagoOpen(true)}>
                <Banknote className="size-4" />
                Registrar pago
              </Button>
            )}
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
              {cliente.activo ? (
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
        }
      />

      {/* 3 tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Saldo actual</p>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums ${
                cliente.saldo > 0 ? "text-red-600" : "text-foreground"
              }`}
            >
              {formatMoneda(cliente.saldo)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Límite de crédito</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {!cliente.cuentaCorriente
                ? "No habilitada"
                : cliente.limiteCredito !== null
                  ? formatMoneda(cliente.limiteCredito)
                  : "Sin límite"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Disponible</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {!cliente.cuentaCorriente
                ? "—"
                : cliente.disponible !== null
                  ? formatMoneda(cliente.disponible)
                  : "Sin límite"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas Datos y facturas / Cuenta corriente */}
      <Tabs
        value={tabActiva}
        onValueChange={(v) =>
          updateParams({ tab: v === "cuenta" ? "cuenta" : null })
        }
      >
        <TabsList>
          <TabsTrigger value="datos">Datos y facturas</TabsTrigger>
          <TabsTrigger value="cuenta">Cuenta corriente</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Card className="lg:col-span-5">
              <CardContent className="p-5 divide-y divide-border/60 text-sm">
                <div className="flex justify-between py-2.5 first:pt-0">
                  <span className="text-muted-foreground">Documento</span>
                  <span className="font-medium font-mono">
                    {cliente.tipoDoc} {cliente.nroDoc}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Domicilio</span>
                  <span className="font-medium text-right">
                    {cliente.domicilio ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Teléfono</span>
                  <span className="font-medium">{cliente.telefono ?? "—"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{cliente.email ?? "—"}</span>
                </div>
                <div className="flex justify-between py-2.5 last:pb-0">
                  <span className="text-muted-foreground">Cuenta corriente</span>
                  <span className="font-medium">
                    {cliente.cuentaCorriente ? "Habilitada" : "No habilitada"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 py-4">
                <CardTitle className="text-sm">Últimas facturas</CardTitle>
                <Link
                  href={`/ventas?clienteId=${cliente.id}`}
                  className="text-xs font-medium text-foreground hover:text-primary transition-colors"
                >
                  Ver todas
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {cliente.ultimasFacturas.length === 0 ? (
                  <EstadoVacio
                    titulo="Sin facturas registradas"
                    descripcion="Todavía no hay ventas emitidas a este cliente."
                  />
                ) : (
                  <Table>
                    <TableBody>
                      {cliente.ultimasFacturas.map((f) => (
                        <TableRow
                          key={f.id}
                          onClick={() => router.push(`/ventas/${f.id}`)}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                            {f.numeroFormateado}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {formatFecha(f.fecha)}
                          </TableCell>
                          <TableCell>
                            <InsigniaFormaPago forma={f.formaPago} />
                          </TableCell>
                          <TableCell>
                            <InsigniaEstadoFactura estado={f.estado} />
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cuenta">
          <Card>
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Label htmlFor="cc-desde" className="text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="cc-desde"
                  type="date"
                  value={filtros.desde}
                  onChange={(e) =>
                    updateParams({
                      tab: "cuenta",
                      desde: e.target.value || null,
                    })
                  }
                  className="w-[155px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="cc-hasta" className="text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="cc-hasta"
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) =>
                    updateParams({
                      tab: "cuenta",
                      hasta: e.target.value || null,
                    })
                  }
                  className="w-[155px]"
                />
              </div>
            </div>

            {cuenta.movimientos.length === 0 && cuenta.saldoAnterior === 0 ? (
              <EstadoVacio
                titulo="Sin movimientos en cuenta corriente"
                descripcion="Las compras a cuenta, anulaciones y pagos aparecerán aquí en orden cronológico."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtros.desde && cuenta.saldoAnterior !== 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">
                        Anterior
                      </TableCell>
                      <TableCell className="text-muted-foreground italic">
                        Saldo acumulado anterior al período
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoneda(cuenta.saldoAnterior)}
                      </TableCell>
                    </TableRow>
                  )}

                  {cuenta.movimientos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        <span>{formatFecha(m.fecha)}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {formatHora(m.fecha)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {m.facturaId ? (
                          <Link
                            href={`/ventas/${m.facturaId}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {m.descripcion}
                          </Link>
                        ) : m.pagoId ? (
                          <Link
                            href={`/clientes/recibos/${m.pagoId}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {m.descripcion}
                          </Link>
                        ) : (
                          <span>{m.descripcion}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.tipo === "debito" ? formatMoneda(m.importe) : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-700 tabular-nums">
                        {m.tipo === "credito" ? formatMoneda(m.importe) : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoneda(m.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-muted-foreground">
                      Saldo al cierre
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-foreground">
                      {formatMoneda(cuenta.saldo)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ClienteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        cliente={cliente}
      />

      <RegistrarPagoDialog
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        cliente={{
          id: cliente.id,
          nombre: cliente.nombre,
          saldo: cliente.saldo,
        }}
      />

      <ConfirmDialog
        open={bajaOpen}
        onOpenChange={setBajaOpen}
        titulo={
          cliente.activo
            ? `¿Dar de baja a ${cliente.nombre}?`
            : `¿Reactivar a ${cliente.nombre}?`
        }
        descripcion={
          cliente.activo
            ? "Solo se puede dar de baja si su saldo es cero. El cliente conservará su historial."
            : "El cliente volverá a estar disponible para ventas."
        }
        textoConfirmar={cliente.activo ? "Dar de baja" : "Reactivar"}
        variante={cliente.activo ? "destructive" : "default"}
        cargando={toggling}
        onConfirm={handleToggleActivo}
      />
    </div>
  );
}
