"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  crearClienteAction,
  editarClienteAction,
  registrarPagoAction,
} from "@/actions/clientes.actions";
import { CampoFormulario, CampoImporte } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFormAction } from "@/hooks/use-form-action";
import type { ActionResult } from "@/lib/actions";
import {
  centavosToInput,
  formatMoneda,
  parseMonedaToCentavos,
} from "@/lib/format";
import {
  crearClienteSchema,
  editarClienteSchema,
} from "@/lib/schemas/clientes";
import { registrarPagoSchema } from "@/lib/schemas/pagos";
import { cn } from "@/lib/utils";
import type { ClienteDTO } from "@/services/clientes.service";

export function ClienteFormDialog({
  open,
  onOpenChange,
  cliente,
  viaApi = false,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: ClienteDTO;
  viaApi?: boolean;
  onCreated?: (cliente: ClienteDTO) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(cliente);

  const [tipoDoc, setTipoDoc] = useState<"DNI" | "CUIT">(
    cliente?.tipoDoc ?? "DNI"
  );
  const [nroDoc, setNroDoc] = useState(cliente?.nroDoc ?? "");
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [domicilio, setDomicilio] = useState(cliente?.domicilio ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [cuentaCorriente, setCuentaCorriente] = useState(
    cliente?.cuentaCorriente ?? false
  );
  const [limiteStr, setLimiteStr] = useState(
    cliente?.limiteCredito ? centavosToInput(cliente.limiteCredito) : ""
  );

  useEffect(() => {
    if (open) {
      setTipoDoc(cliente?.tipoDoc ?? "DNI");
      setNroDoc(cliente?.nroDoc ?? "");
      setNombre(cliente?.nombre ?? "");
      setDomicilio(cliente?.domicilio ?? "");
      setTelefono(cliente?.telefono ?? "");
      setEmail(cliente?.email ?? "");
      setCuentaCorriente(cliente?.cuentaCorriente ?? false);
      setLimiteStr(
        cliente?.limiteCredito ? centavosToInput(cliente.limiteCredito) : ""
      );
    }
  }, [open, cliente]);

  async function postClienteViaApi(data: unknown): Promise<ActionResult<ClienteDTO>> {
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error };
    }
    return { ok: true, data: json as ClienteDTO };
  }

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: isEdit ? editarClienteSchema : crearClienteSchema,
    action: (data) => {
      if (isEdit && cliente) return editarClienteAction(cliente.id, data);
      if (viaApi) return postClienteViaApi(data);
      return crearClienteAction(data);
    },
    successMessage: isEdit
      ? "Cliente actualizado."
      : "Cliente creado correctamente.",
    onSuccess: (created) => {
      onOpenChange(false);
      onCreated?.(created);
      if (!viaApi) {
        router.refresh();
      }
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let limiteCredito: number | null = null;
    if (cuentaCorriente && limiteStr.trim() !== "") {
      const parsed = parseMonedaToCentavos(limiteStr);
      limiteCredito = parsed ?? -1;
    }

    await submit({
      tipoDoc,
      nroDoc,
      nombre,
      domicilio: domicilio.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      cuentaCorriente,
      limiteCredito,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            El documento no se puede repetir entre clientes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CampoFormulario id="cli-tipo" label="Tipo" error={fieldErrors.tipoDoc}>
              <Select
                value={tipoDoc}
                onValueChange={(v) => {
                  setTipoDoc(v as "DNI" | "CUIT");
                  clearError("tipoDoc");
                  clearError("nroDoc");
                }}
              >
                <SelectTrigger id="cli-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CUIT">CUIT</SelectItem>
                </SelectContent>
              </Select>
            </CampoFormulario>

            <CampoFormulario
              id="cli-doc"
              label="Número de documento"
              error={fieldErrors.nroDoc}
              className="sm:col-span-2"
            >
              <Input
                id="cli-doc"
                placeholder={tipoDoc === "DNI" ? "28.456.123" : "30-71234567-1"}
                value={nroDoc}
                onChange={(e) => {
                  setNroDoc(e.target.value);
                  clearError("nroDoc");
                }}
                aria-invalid={Boolean(fieldErrors.nroDoc)}
              />
            </CampoFormulario>
          </div>

          <CampoFormulario
            id="cli-nombre"
            label="Nombre o razón social"
            error={fieldErrors.nombre}
          >
            <Input
              id="cli-nombre"
              placeholder="Ej: Mariana López"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                clearError("nombre");
              }}
              aria-invalid={Boolean(fieldErrors.nombre)}
            />
          </CampoFormulario>

          <CampoFormulario
            id="cli-domicilio"
            label="Domicilio"
            opcional
            error={fieldErrors.domicilio}
          >
            <Input
              id="cli-domicilio"
              value={domicilio}
              onChange={(e) => {
                setDomicilio(e.target.value);
                clearError("domicilio");
              }}
            />
          </CampoFormulario>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoFormulario
              id="cli-telefono"
              label="Teléfono"
              opcional
              error={fieldErrors.telefono}
            >
              <Input
                id="cli-telefono"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  clearError("telefono");
                }}
              />
            </CampoFormulario>

            <CampoFormulario
              id="cli-email"
              label="Email"
              opcional
              error={fieldErrors.email}
            >
              <Input
                id="cli-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </CampoFormulario>
          </div>

          <div className="rounded-lg border border-border bg-muted/35 p-3.5 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="cli-cc"
                checked={cuentaCorriente}
                onCheckedChange={setCuentaCorriente}
              />
              <div>
                <label
                  htmlFor="cli-cc"
                  className="text-sm font-medium text-foreground cursor-pointer block"
                >
                  Habilitado para cuenta corriente
                </label>
                <p className="text-xs text-muted-foreground">
                  Puede comprar a cuenta y pagar después.
                </p>
              </div>
            </div>

            {cuentaCorriente && (
              <CampoFormulario
                id="cli-limite"
                label="Límite de crédito"
                opcional
                ayuda="Dejalo vacío si no tiene tope de deuda."
                error={fieldErrors.limiteCredito}
              >
                <CampoImporte
                  id="cli-limite"
                  value={limiteStr}
                  onChange={(v) => {
                    setLimiteStr(v);
                    clearError("limiteCredito");
                  }}
                  invalid={Boolean(fieldErrors.limiteCredito)}
                />
              </CampoFormulario>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const MEDIOS_OPCIONES: Array<{
  value: "efectivo" | "transferencia" | "tarjeta_debito";
  label: string;
}> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta_debito", label: "Tarjeta de débito" },
];

export function RegistrarPagoDialog({
  open,
  onOpenChange,
  cliente,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: { id: number; nombre: string; saldo: number };
}) {
  const router = useRouter();
  const [importeStr, setImporteStr] = useState("");
  const [medio, setMedio] = useState<"efectivo" | "transferencia" | "tarjeta_debito">(
    "efectivo"
  );
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (open) {
      setImporteStr("");
      setMedio("efectivo");
      setObservacion("");
    }
  }, [open]);

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: registrarPagoSchema,
    action: (data) => registrarPagoAction(cliente.id, data),
    successMessage: (pago) => `Pago registrado · Recibo ${pago.numeroRecibo}`,
    onSuccess: (pago) => {
      onOpenChange(false);
      router.push(`/clientes/recibos/${pago.id}`);
      router.refresh();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const importe = parseMonedaToCentavos(importeStr);
    await submit({
      importe: importe ?? -1,
      medio,
      observacion: observacion.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {cliente.nombre} · saldo adeudado {formatMoneda(cliente.saldo)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <CampoFormulario
              id="pago-importe"
              label="Importe"
              error={fieldErrors.importe}
            >
              <CampoImporte
                id="pago-importe"
                value={importeStr}
                onChange={(v) => {
                  setImporteStr(v);
                  clearError("importe");
                }}
                invalid={Boolean(fieldErrors.importe)}
              />
            </CampoFormulario>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImporteStr(centavosToInput(cliente.saldo));
                  clearError("importe");
                }}
              >
                Saldo total
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImporteStr(centavosToInput(Math.round(cliente.saldo / 2)));
                  clearError("importe");
                }}
              >
                La mitad
              </Button>
            </div>
          </div>

          <CampoFormulario label="Medio de pago" error={fieldErrors.medio}>
            <div className="grid grid-cols-3 gap-2">
              {MEDIOS_OPCIONES.map((opt) => {
                const selected = medio === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMedio(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-input bg-card text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected
                          ? "border-primary bg-primary"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {selected && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="leading-tight">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CampoFormulario>

          <CampoFormulario
            id="pago-obs"
            label="Observación"
            opcional
            error={fieldErrors.observacion}
          >
            <Input
              id="pago-obs"
              placeholder="Ej: Pago parcial o número de comprobante"
              value={observacion}
              onChange={(e) => {
                setObservacion(e.target.value);
                clearError("observacion");
              }}
            />
          </CampoFormulario>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Registrando..." : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
