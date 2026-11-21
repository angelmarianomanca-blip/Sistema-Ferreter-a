"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  crearProductoAction,
  editarProductoAction,
  registrarMovimientoStockAction,
} from "@/actions/productos.actions";
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
import { useFormAction } from "@/hooks/use-form-action";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO } from "@/lib/constants";
import { centavosToInput, parseMonedaToCentavos } from "@/lib/format";
import {
  crearProductoSchema,
  editarProductoSchema,
} from "@/lib/schemas/productos";
import { registrarMovimientoStockSchema } from "@/lib/schemas/stock";
import type { CategoriaDTO } from "@/services/categorias.service";
import type { ProductoDTO } from "@/services/productos.service";

export function ProductoFormDialog({
  open,
  onOpenChange,
  categorias,
  producto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: CategoriaDTO[];
  producto?: ProductoDTO;
}) {
  const router = useRouter();
  const isEdit = Boolean(producto);

  const [codigo, setCodigo] = useState(producto?.codigo ?? "");
  const [categoriaId, setCategoriaId] = useState(
    producto ? String(producto.categoria.id) : ""
  );
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [precioStr, setPrecioStr] = useState(
    producto ? centavosToInput(producto.precio) : ""
  );
  const [stockMinimo, setStockMinimo] = useState(
    producto ? String(producto.stockMinimo) : "0"
  );
  const [stockInicial, setStockInicial] = useState("0");

  useEffect(() => {
    if (open) {
      setCodigo(producto?.codigo ?? "");
      setCategoriaId(producto ? String(producto.categoria.id) : "");
      setDescripcion(producto?.descripcion ?? "");
      setPrecioStr(producto ? centavosToInput(producto.precio) : "");
      setStockMinimo(producto ? String(producto.stockMinimo) : "0");
      setStockInicial("0");
    }
  }, [open, producto]);

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: isEdit ? editarProductoSchema : crearProductoSchema,
    action: (data) =>
      isEdit && producto
        ? editarProductoAction(producto.id, data)
        : crearProductoAction(data),
    successMessage: isEdit
      ? "Producto actualizado correctamente."
      : "Producto creado correctamente.",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const precioCentavos = parseMonedaToCentavos(precioStr);
    const basePayload = {
      codigo,
      descripcion,
      categoriaId: categoriaId ? Number(categoriaId) : 0,
      precio: precioCentavos ?? -1,
      stockMinimo: Number(stockMinimo === "" ? 0 : stockMinimo),
    };

    if (isEdit) {
      await submit(basePayload);
    } else {
      const inicial = Number(stockInicial === "" ? 0 : stockInicial);
      await submit({
        ...basePayload,
        ...(inicial > 0 ? { stockInicial: inicial } : {}),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "La existencia se modifica solo mediante ingresos y egresos de stock."
              : "El stock inicial se registra como un movimiento de ingreso."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoFormulario
              id="prod-codigo"
              label="Código"
              error={fieldErrors.codigo}
            >
              <Input
                id="prod-codigo"
                placeholder="HE-010"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value);
                  clearError("codigo");
                }}
                aria-invalid={Boolean(fieldErrors.codigo)}
                className="font-mono uppercase"
              />
            </CampoFormulario>

            <CampoFormulario
              id="prod-categoria"
              label="Categoría"
              error={fieldErrors.categoriaId}
            >
              <Select
                value={categoriaId}
                onValueChange={(v) => {
                  setCategoriaId(v);
                  clearError("categoriaId");
                }}
              >
                <SelectTrigger id="prod-categoria">
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CampoFormulario>
          </div>

          <CampoFormulario
            id="prod-descripcion"
            label="Descripción"
            error={fieldErrors.descripcion}
          >
            <Input
              id="prod-descripcion"
              placeholder="Ej: Martillo carpintero 500 g"
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                clearError("descripcion");
              }}
              aria-invalid={Boolean(fieldErrors.descripcion)}
            />
          </CampoFormulario>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoFormulario
              id="prod-precio"
              label="Precio de venta"
              ayuda="Final, con impuestos incluidos."
              error={fieldErrors.precio}
            >
              <CampoImporte
                id="prod-precio"
                value={precioStr}
                onChange={(v) => {
                  setPrecioStr(v);
                  clearError("precio");
                }}
                invalid={Boolean(fieldErrors.precio)}
              />
            </CampoFormulario>

            <CampoFormulario
              id="prod-minimo"
              label="Stock mínimo"
              error={fieldErrors.stockMinimo}
            >
              <Input
                id="prod-minimo"
                type="number"
                min={0}
                step={1}
                value={stockMinimo}
                onChange={(e) => {
                  setStockMinimo(e.target.value);
                  clearError("stockMinimo");
                }}
                aria-invalid={Boolean(fieldErrors.stockMinimo)}
                className="tabular-nums"
              />
            </CampoFormulario>
          </div>

          {!isEdit && (
            <CampoFormulario
              id="prod-inicial"
              label="Stock inicial"
              opcional
              error={fieldErrors.stockInicial}
            >
              <Input
                id="prod-inicial"
                type="number"
                min={0}
                step={1}
                value={stockInicial}
                onChange={(e) => {
                  setStockInicial(e.target.value);
                  clearError("stockInicial");
                }}
                aria-invalid={Boolean(fieldErrors.stockInicial)}
                className="tabular-nums"
              />
            </CampoFormulario>
          )}

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
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MovimientoStockDialog({
  open,
  onOpenChange,
  tipo,
  productos,
  productoFijo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "ingreso" | "egreso";
  productos?: Array<{ id: number; codigo: string; descripcion: string; existencia: number }>;
  productoFijo?: { id: number; codigo: string; descripcion: string; existencia: number };
}) {
  const router = useRouter();
  const motivos = tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;

  const [productoId, setProductoId] = useState(
    productoFijo ? String(productoFijo.id) : ""
  );
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState<string>(motivos[0]);
  const [observacion, setObservacion] = useState("");
  const [prodError, setProdError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setProductoId(productoFijo ? String(productoFijo.id) : "");
      setCantidad("1");
      setMotivo(tipo === "ingreso" ? MOTIVOS_INGRESO[0] : MOTIVOS_EGRESO[0]);
      setObservacion("");
      setProdError(undefined);
    }
  }, [open, tipo, productoFijo]);

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: registrarMovimientoStockSchema,
    action: (data) => registrarMovimientoStockAction(Number(productoId), data),
    successMessage:
      tipo === "ingreso"
        ? "Ingreso de stock registrado."
        : "Egreso de stock registrado.",
    onSuccess: () => {
      onOpenChange(false);
      router.refresh();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productoId) {
      setProdError("Elegí un producto.");
      return;
    }
    setProdError(undefined);
    await submit({
      tipo,
      cantidad: Number(cantidad),
      motivo,
      observacion: observacion.trim() ? observacion.trim() : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tipo === "ingreso" ? "Ingreso de stock" : "Egreso de stock"}
          </DialogTitle>
          <DialogDescription>
            {tipo === "ingreso"
              ? "Suma unidades al inventario y deja el movimiento registrado."
              : "Resta unidades. Un egreso no puede dejar la existencia en negativo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {productoFijo ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                {productoFijo.descripcion}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {productoFijo.codigo} · Existencia actual:{" "}
                {productoFijo.existencia}
              </p>
            </div>
          ) : (
            <CampoFormulario
              id="mov-producto"
              label="Producto"
              error={prodError}
            >
              <Select
                value={productoId}
                onValueChange={(v) => {
                  setProductoId(v);
                  setProdError(undefined);
                }}
              >
                <SelectTrigger id="mov-producto">
                  <SelectValue placeholder="Elegí un producto" />
                </SelectTrigger>
                <SelectContent>
                  {(productos ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.codigo} · {p.descripcion} (disp: {p.existencia})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CampoFormulario>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoFormulario
              id="mov-cantidad"
              label="Cantidad"
              error={fieldErrors.cantidad}
            >
              <Input
                id="mov-cantidad"
                type="number"
                min={1}
                step={1}
                value={cantidad}
                onChange={(e) => {
                  setCantidad(e.target.value);
                  clearError("cantidad");
                }}
                aria-invalid={Boolean(fieldErrors.cantidad)}
                className="tabular-nums"
              />
            </CampoFormulario>

            <CampoFormulario
              id="mov-motivo"
              label="Motivo"
              error={fieldErrors.motivo}
            >
              <Select
                value={motivo}
                onValueChange={(v) => {
                  setMotivo(v);
                  clearError("motivo");
                }}
              >
                <SelectTrigger id="mov-motivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {motivos.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CampoFormulario>
          </div>

          <CampoFormulario
            id="mov-obs"
            label="Observación"
            opcional
            error={fieldErrors.observacion}
          >
            <Input
              id="mov-obs"
              placeholder="Detalle adicional"
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
              {submitting
                ? "Registrando..."
                : tipo === "ingreso"
                  ? "Registrar ingreso"
                  : "Registrar egreso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
