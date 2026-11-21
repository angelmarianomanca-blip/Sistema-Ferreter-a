import { Badge } from "@/components/ui/badge";
import {
  FORMAS_PAGO_LABELS,
  ROLES_LABELS,
  TIPOS_MOVIMIENTO_STOCK_LABELS,
} from "@/lib/constants";

export function InsigniaEstadoFactura({
  estado,
}: {
  estado: "emitida" | "anulada";
}) {
  if (estado === "emitida") {
    return (
      <Badge variant="success">
        <span className="size-1.5 rounded-full bg-emerald-600" />
        Emitida
      </Badge>
    );
  }
  return (
    <Badge variant="danger">
      <span className="size-1.5 rounded-full bg-red-600" />
      Anulada
    </Badge>
  );
}

export function InsigniaFormaPago({
  forma,
}: {
  forma: "contado" | "tarjeta" | "cuenta_corriente";
}) {
  if (forma === "cuenta_corriente") {
    return <Badge variant="warning">{FORMAS_PAGO_LABELS[forma]}</Badge>;
  }
  if (forma === "contado") {
    return <Badge variant="teal">{FORMAS_PAGO_LABELS[forma]}</Badge>;
  }
  return <Badge variant="secondary">{FORMAS_PAGO_LABELS[forma]}</Badge>;
}

export function InsigniaActivo({
  activo,
  femenino = false,
}: {
  activo: boolean;
  femenino?: boolean;
}) {
  if (activo) {
    return (
      <Badge variant="success">
        <span className="size-1.5 rounded-full bg-emerald-600" />
        {femenino ? "Activa" : "Activo"}
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      <span className="size-1.5 rounded-full bg-slate-400" />
      {femenino ? "Inactiva" : "Inactivo"}
    </Badge>
  );
}

export function InsigniaRol({ rol }: { rol: "admin" | "vendedor" }) {
  return (
    <Badge variant={rol === "admin" ? "teal" : "muted"}>
      {ROLES_LABELS[rol]}
    </Badge>
  );
}

export function InsigniaTipoMovimiento({
  tipo,
}: {
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
}) {
  const variantMap = {
    venta: "muted" as const,
    anulacion: "teal" as const,
    ingreso: "success" as const,
    egreso: "warning" as const,
  };
  return (
    <Badge variant={variantMap[tipo]}>
      {TIPOS_MOVIMIENTO_STOCK_LABELS[tipo]}
    </Badge>
  );
}

export function InsigniaBajoMinimo({ existencia }: { existencia: number }) {
  return (
    <Badge variant="warning" className="tabular-nums">
      {existencia} · bajo mínimo
    </Badge>
  );
}

export function InsigniaCuentaCorriente() {
  return <Badge variant="teal">Cta. cte.</Badge>;
}
