"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ClienteFormDialog } from "@/components/clientes/cliente-dialogs";
import { CampoFormulario, CampoImporte } from "@/components/shared/form-field";
import { EncabezadoPagina } from "@/components/shared/page-header";
import { InsigniaCuentaCorriente } from "@/components/shared/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AuthUser } from "@/lib/auth";
import { MARCAS_TARJETA } from "@/lib/constants";
import {
  centavosToInput,
  formatMoneda,
  parseMonedaToCentavos,
} from "@/lib/format";
import { emitirFacturaSchema } from "@/lib/schemas/facturas";
import { cn } from "@/lib/utils";
import type { ClienteDTO } from "@/services/clientes.service";
import type { ProductoDTO } from "@/services/productos.service";

interface CartItem {
  productoId: number;
  codigo: string;
  descripcion: string;
  precio: number;
  existencia: number;
  cantidad: number;
}

export function NuevaVentaView({
  vendedor,
  proximoNumero,
}: {
  vendedor: AuthUser;
  proximoNumero: string;
}) {
  const router = useRouter();

  // Refs para atajos de teclado F2, F4, F8
  const prodSearchRef = useRef<HTMLInputElement>(null);
  const cliSearchRef = useRef<HTMLInputElement>(null);
  const pagoInputRef = useRef<HTMLInputElement>(null);

  // Ítems y búsqueda en vivo
  const [items, setItems] = useState<CartItem[]>([]);
  const [qtyInput, setQtyInput] = useState("1");
  const [prodQuery, setProdQuery] = useState("");
  const [prodResults, setProdResults] = useState<ProductoDTO[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodHighlight, setProdHighlight] = useState(0);

  // Comprador
  const [modoComprador, setModoComprador] = useState<"final" | "cliente">(
    "final"
  );
  const [cliente, setCliente] = useState<ClienteDTO | null>(null);
  const [cliQuery, setCliQuery] = useState("");
  const [cliResults, setCliResults] = useState<ClienteDTO[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [cliOpen, setCliOpen] = useState(false);
  const [altaClienteOpen, setAltaClienteOpen] = useState(false);

  // Forma de pago
  const [formaPago, setFormaPago] = useState<
    "contado" | "tarjeta" | "cuenta_corriente"
  >("contado");
  const [montoRecibidoStr, setMontoRecibidoStr] = useState("");
  const [tarjetaTipo, setTarjetaTipo] = useState<"debito" | "credito">("debito");
  const [tarjetaMarca, setTarjetaMarca] = useState<string>(MARCAS_TARJETA[0]);
  const [tarjetaUltimos4, setTarjetaUltimos4] = useState("");

  // Estado de envío
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const total = items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  const totalUnidades = items.reduce((acc, it) => acc + it.cantidad, 0);

  const puedeCuentaCorriente = Boolean(cliente && cliente.cuentaCorriente);

  // Si cambia el comprador y pierde cuenta corriente, volver a contado
  useEffect(() => {
    if (formaPago === "cuenta_corriente" && !puedeCuentaCorriente) {
      setFormaPago("contado");
    }
  }, [formaPago, puedeCuentaCorriente]);

  // Búsqueda en vivo de productos vía API REST
  useEffect(() => {
    const trimmed = prodQuery.trim();
    if (!trimmed) {
      setProdResults([]);
      setProdOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setProdLoading(true);
      try {
        const res = await fetch(
          `/api/productos?q=${encodeURIComponent(trimmed)}&activo=true&pageSize=8`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setProdResults(json.data ?? []);
          setProdHighlight(0);
          setProdOpen(true);
        }
      } finally {
        if (!cancelled) setProdLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [prodQuery]);

  // Búsqueda en vivo de clientes vía API REST
  useEffect(() => {
    if (modoComprador !== "cliente" || cliente) return;
    const trimmed = cliQuery.trim();
    if (!trimmed) {
      setCliResults([]);
      setCliOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setCliLoading(true);
      try {
        const res = await fetch(
          `/api/clientes?q=${encodeURIComponent(trimmed)}&activo=true&pageSize=8`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setCliResults(json.data ?? []);
          setCliOpen(true);
        }
      } finally {
        if (!cancelled) setCliLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cliQuery, modoComprador, cliente]);

  const agregarProducto = useCallback(
    (prod: ProductoDTO) => {
      const cant = Math.max(1, Number.parseInt(qtyInput, 10) || 1);
      if (prod.existencia <= 0) {
        toast.error(`"${prod.descripcion}" no tiene existencia disponible.`);
        return;
      }

      setItems((prev) => {
        const idx = prev.findIndex((i) => i.productoId === prod.id);
        if (idx >= 0) {
          const current = prev[idx];
          const nuevaCant = current.cantidad + cant;
          if (nuevaCant > prod.existencia) {
            toast.error(
              `Stock disponible para ${prod.codigo}: ${prod.existencia} unidades.`
            );
            return prev;
          }
          const copy = [...prev];
          copy[idx] = {
            ...current,
            existencia: prod.existencia,
            cantidad: nuevaCant,
          };
          return copy;
        }

        if (cant > prod.existencia) {
          toast.error(
            `Stock disponible para ${prod.codigo}: ${prod.existencia} unidades.`
          );
          return prev;
        }

        return [
          ...prev,
          {
            productoId: prod.id,
            codigo: prod.codigo,
            descripcion: prod.descripcion,
            precio: prod.precio,
            existencia: prod.existencia,
            cantidad: cant,
          },
        ];
      });

      setProdQuery("");
      setQtyInput("1");
      setProdOpen(false);
      setErrorMsg(null);
      prodSearchRef.current?.focus();
    },
    [qtyInput]
  );

  function actualizarCantidad(productoId: number, nextQty: number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productoId !== productoId) return it;
        if (nextQty < 1) return it;
        if (nextQty > it.existencia) {
          toast.error(
            `Máximo disponible para ${it.codigo}: ${it.existencia} unidades.`
          );
          return { ...it, cantidad: it.existencia };
        }
        return { ...it, cantidad: nextQty };
      })
    );
  }

  function quitarItem(productoId: number) {
    setItems((prev) => prev.filter((it) => it.productoId !== productoId));
  }

  function descartarVenta() {
    setItems([]);
    setProdQuery("");
    setQtyInput("1");
    setModoComprador("final");
    setCliente(null);
    setCliQuery("");
    setFormaPago("contado");
    setMontoRecibidoStr("");
    setTarjetaUltimos4("");
    setErrorMsg(null);
    prodSearchRef.current?.focus();
  }

  // Cálculos de pago
  const montoRecibidoParsed =
    montoRecibidoStr.trim() === ""
      ? total
      : parseMonedaToCentavos(montoRecibidoStr);
  const montoInsuficiente =
    formaPago === "contado" &&
    montoRecibidoStr.trim() !== "" &&
    (montoRecibidoParsed === null || montoRecibidoParsed < total);
  const vuelto =
    formaPago === "contado" &&
    montoRecibidoParsed !== null &&
    montoRecibidoParsed >= total
      ? montoRecibidoParsed - total
      : 0;

  const saldoResultante =
    cliente && formaPago === "cuenta_corriente" ? cliente.saldo + total : 0;
  const excedeLimite =
    cliente !== null &&
    formaPago === "cuenta_corriente" &&
    cliente.limiteCredito !== null &&
    saldoResultante > cliente.limiteCredito;

  const puedeConfirmar =
    items.length > 0 &&
    !submitting &&
    (modoComprador === "final" || cliente !== null) &&
    !montoInsuficiente &&
    !excedeLimite;

  const confirmarVenta = useCallback(async () => {
    if (items.length === 0 || submitting) return;
    if (modoComprador === "cliente" && !cliente) {
      setErrorMsg("Elegí un cliente o pasá a Consumidor final.");
      return;
    }

    setErrorMsg(null);

    let pagoPayload: unknown;
    if (formaPago === "contado") {
      if (montoRecibidoStr.trim() === "") {
        pagoPayload = { forma: "contado" };
      } else {
        const parsed = parseMonedaToCentavos(montoRecibidoStr);
        if (parsed === null || parsed < total) {
          setErrorMsg("El monto recibido no cubre el total de la factura.");
          return;
        }
        pagoPayload = { forma: "contado", montoRecibido: parsed };
      }
    } else if (formaPago === "tarjeta") {
      pagoPayload = {
        forma: "tarjeta",
        tarjeta: {
          tipo: tarjetaTipo,
          marca: tarjetaMarca,
          ultimos4: tarjetaUltimos4.trim(),
        },
      };
    } else {
      pagoPayload = { forma: "cuenta_corriente" };
    }

    const payload = {
      clienteId: modoComprador === "cliente" && cliente ? cliente.id : null,
      items: items.map((it) => ({
        productoId: it.productoId,
        cantidad: it.cantidad,
      })),
      pago: pagoPayload,
    };

    const parsed = emitirFacturaSchema.safeParse(payload);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? "Revisá los datos de la venta.";
      setErrorMsg(firstMsg);
      toast.error(firstMsg);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message ?? "No se pudo confirmar la factura.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      toast.success(`Factura ${json.numeroFormateado} emitida.`);
      router.push(`/ventas/${json.id}`);
      router.refresh();
    } catch {
      setErrorMsg("Error de conexión al confirmar la factura.");
      toast.error("Error de conexión al confirmar la factura.");
    } finally {
      setSubmitting(false);
    }
  }, [
    items,
    submitting,
    modoComprador,
    cliente,
    formaPago,
    montoRecibidoStr,
    total,
    tarjetaTipo,
    tarjetaMarca,
    tarjetaUltimos4,
    router,
  ]);

  // Atajos de teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (altaClienteOpen) return;
      if (e.key === "F2") {
        e.preventDefault();
        prodSearchRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        setModoComprador("cliente");
        setTimeout(() => cliSearchRef.current?.focus(), 20);
      } else if (e.key === "F8") {
        e.preventDefault();
        pagoInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        void confirmarVenta();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [altaClienteOpen, confirmarVenta]);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Nueva venta"
        subtitulo="El número se asigna al confirmar. Operable con teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna izquierda: Ítems */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm">Ítems</CardTitle>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>
                {items.length} {items.length === 1 ? "renglón" : "renglones"}
              </span>
              <span>·</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                F2
              </kbd>
              <span>buscar</span>
            </span>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Buscador de producto + cantidad */}
            <div className="relative flex gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                aria-label="Cantidad a agregar"
                className="w-16 text-center tabular-nums shrink-0"
              />
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={prodSearchRef}
                  autoFocus
                  placeholder="Código o descripción · Enter agrega"
                  value={prodQuery}
                  onChange={(e) => setProdQuery(e.target.value)}
                  onFocus={() => {
                    if (prodResults.length > 0) setProdOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (!prodOpen || prodResults.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setProdHighlight((h) => (h + 1) % prodResults.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setProdHighlight(
                        (h) => (h - 1 + prodResults.length) % prodResults.length
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const chosen = prodResults[prodHighlight];
                      if (chosen) agregarProducto(chosen);
                    } else if (e.key === "Escape") {
                      setProdOpen(false);
                    }
                  }}
                  className="pl-9"
                />

                {/* Dropdown de resultados */}
                {prodOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                    {prodLoading ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        Buscando productos...
                      </p>
                    ) : prodResults.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        No encontramos productos para «{prodQuery}».
                      </p>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                        {prodResults.map((p, idx) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseEnter={() => setProdHighlight(idx)}
                            onClick={() => agregarProducto(p)}
                            disabled={p.existencia <= 0}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                              idx === prodHighlight
                                ? "bg-[#e3f4f5]"
                                : "hover:bg-muted/50"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                <span className="font-mono text-xs text-muted-foreground mr-2">
                                  {p.codigo}
                                </span>
                                {p.descripcion}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Disponible: {p.existencia}
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                              {formatMoneda(p.precio)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de ítems o estado vacío */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-border/60">
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
                  <ShoppingCart className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Todavía no hay productos
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Buscalos por código o descripción. Probá con «cinta», «PI-» o
                  «martillo».
                </p>
              </div>
            ) : (
              <div className="border-t border-border/70 -mx-5 px-5 pt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted-foreground">
                      <th className="py-2 text-left font-semibold">Descripción</th>
                      <th className="py-2 text-center font-semibold">Cantidad</th>
                      <th className="py-2 text-right font-semibold">Precio unit.</th>
                      <th className="py-2 text-right font-semibold">Subtotal</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((it) => (
                      <tr key={it.productoId}>
                        <td className="py-3 pr-2">
                          <p className="font-medium text-foreground">
                            {it.descripcion}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{it.codigo}</span> ·
                            Disponible: {it.existencia}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={it.cantidad <= 1}
                              onClick={() =>
                                actualizarCantidad(
                                  it.productoId,
                                  it.cantidad - 1
                                )
                              }
                              aria-label="Disminuir cantidad"
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={it.existencia}
                              value={it.cantidad}
                              onChange={(e) => {
                                const val = Number.parseInt(e.target.value, 10);
                                if (!Number.isNaN(val)) {
                                  actualizarCantidad(it.productoId, val);
                                }
                              }}
                              className="h-7 w-14 text-center px-1 tabular-nums"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={it.cantidad >= it.existencia}
                              onClick={() =>
                                actualizarCantidad(
                                  it.productoId,
                                  it.cantidad + 1
                                )
                              }
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right tabular-nums whitespace-nowrap">
                          {formatMoneda(it.precio)}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatMoneda(it.precio * it.cantidad)}
                        </td>
                        <td className="py-3 pl-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => quitarItem(it.productoId)}
                            aria-label="Quitar producto"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha: Comprador + Pago + Total */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card Comprador */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-sm">Comprador</CardTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  F4
                </kbd>
                <span>buscar cliente</span>
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setModoComprador("final");
                    setCliente(null);
                  }}
                  className={cn(
                    "rounded-md py-1.5 transition-colors cursor-pointer",
                    modoComprador === "final"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Consumidor final
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoComprador("cliente");
                    setTimeout(() => cliSearchRef.current?.focus(), 20);
                  }}
                  className={cn(
                    "rounded-md py-1.5 transition-colors cursor-pointer",
                    modoComprador === "cliente"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cliente registrado
                </button>
              </div>

              {modoComprador === "final" ? (
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground">
                  <User className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">
                      Consumidor final
                    </p>
                    <p className="mt-0.5">
                      No requiere datos. No puede comprar en cuenta corriente.
                    </p>
                  </div>
                </div>
              ) : cliente ? (
                <div className="rounded-lg border border-border bg-muted/25 p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {cliente.nombre}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {cliente.tipoDoc} {cliente.nroDoc}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCliente(null);
                        setCliQuery("");
                        setTimeout(() => cliSearchRef.current?.focus(), 20);
                      }}
                      className="h-7 px-2 text-xs"
                    >
                      <X className="size-3.5" />
                      Cambiar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      {cliente.cuentaCorriente ? (
                        <InsigniaCuentaCorriente />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sin cuenta corriente
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Saldo{" "}
                      <strong
                        className={cn(
                          "tabular-nums",
                          cliente.saldo > 0
                            ? "text-red-600"
                            : "text-foreground"
                        )}
                      >
                        {formatMoneda(cliente.saldo)}
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      ref={cliSearchRef}
                      placeholder="Nombre, DNI o CUIT"
                      value={cliQuery}
                      onChange={(e) => setCliQuery(e.target.value)}
                      className="pl-9"
                    />
                    {cliOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                        {cliLoading ? (
                          <p className="px-3.5 py-2.5 text-xs text-muted-foreground">
                            Buscando clientes...
                          </p>
                        ) : cliResults.length === 0 ? (
                          <p className="px-3.5 py-2.5 text-xs text-muted-foreground">
                            No encontramos clientes para «{cliQuery}».
                          </p>
                        ) : (
                          <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                            {cliResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setCliente(c);
                                  setCliOpen(false);
                                  setCliQuery("");
                                }}
                                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-[#e3f4f5] transition-colors cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {c.nombre}
                                  </p>
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {c.tipoDoc} {c.nroDoc}
                                  </p>
                                </div>
                                {c.cuentaCorriente && <InsigniaCuentaCorriente />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAltaClienteOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <UserPlus className="size-3.5" />
                    Dar de alta un cliente nuevo
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Forma de pago */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-sm">Forma de pago</CardTitle>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  F8
                </kbd>
                <span>ir al pago</span>
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 rounded-lg bg-muted p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFormaPago("contado")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors cursor-pointer",
                    formaPago === "contado"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Banknote className="size-3.5" />
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setFormaPago("tarjeta")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors cursor-pointer",
                    formaPago === "tarjeta"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CreditCard className="size-3.5" />
                  Tarjeta
                </button>
                <button
                  type="button"
                  disabled={!puedeCuentaCorriente}
                  onClick={() => setFormaPago("cuenta_corriente")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed",
                    formaPago === "cuenta_corriente"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Cta. cte.
                </button>
              </div>

              {formaPago === "contado" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <CampoFormulario
                      id="venta-monto-recibido"
                      label="Monto recibido"
                      error={
                        montoInsuficiente
                          ? "No cubre el total."
                          : undefined
                      }
                    >
                      <CampoImporte
                        inputRef={pagoInputRef}
                        id="venta-monto-recibido"
                        value={montoRecibidoStr}
                        onChange={setMontoRecibidoStr}
                        placeholder={centavosToInput(total)}
                        invalid={montoInsuficiente}
                      />
                    </CampoFormulario>

                    <div className="pb-1">
                      <p className="text-xs text-muted-foreground">Vuelto</p>
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {formatMoneda(vuelto)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si lo dejás vacío, se toma el importe justo.
                  </p>
                </div>
              )}

              {formaPago === "tarjeta" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <CampoFormulario id="tarj-tipo" label="Tipo">
                      <Select
                        value={tarjetaTipo}
                        onValueChange={(v) =>
                          setTarjetaTipo(v as "debito" | "credito")
                        }
                      >
                        <SelectTrigger id="tarj-tipo">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debito">Débito</SelectItem>
                          <SelectItem value="credito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </CampoFormulario>

                    <CampoFormulario id="tarj-marca" label="Marca">
                      <Select
                        value={tarjetaMarca}
                        onValueChange={setTarjetaMarca}
                      >
                        <SelectTrigger id="tarj-marca">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARCAS_TARJETA.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CampoFormulario>
                  </div>

                  <CampoFormulario
                    id="tarj-u4"
                    label="Últimos 4 dígitos"
                    ayuda="Nunca se solicita ni se guarda el número completo."
                  >
                    <Input
                      ref={pagoInputRef}
                      id="tarj-u4"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4821"
                      value={tarjetaUltimos4}
                      onChange={(e) =>
                        setTarjetaUltimos4(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      className="font-mono tracking-widest"
                    />
                  </CampoFormulario>
                </div>
              )}

              {formaPago === "cuenta_corriente" && cliente && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo actual</span>
                    <span className="tabular-nums">
                      {formatMoneda(cliente.saldo)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Esta factura</span>
                    <span className="tabular-nums">
                      + {formatMoneda(total)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Saldo resultante</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        excedeLimite ? "text-destructive" : "text-foreground"
                      )}
                    >
                      {formatMoneda(saldoResultante)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Límite de crédito</span>
                    <span className="tabular-nums">
                      {cliente.limiteCredito !== null
                        ? formatMoneda(cliente.limiteCredito)
                        : "Sin límite"}
                    </span>
                  </div>
                  {excedeLimite && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      Supera el límite de crédito por{" "}
                      {formatMoneda(saldoResultante - cliente.limiteCredito!)}.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card Resumen y Confirmación */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidades</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {totalUnidades}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendedor</span>
                  <span className="font-medium text-foreground">
                    {vendedor.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Número</span>
                  <span className="font-mono text-foreground">
                    {proximoNumero}{" "}
                    <span className="font-sans text-muted-foreground">
                      (al confirmar)
                    </span>
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">
                  Total
                </span>
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {formatMoneda(total)}
                </span>
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  {errorMsg}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full justify-between"
                disabled={!puedeConfirmar}
                onClick={() => void confirmarVenta()}
              >
                <span className="flex items-center gap-2">
                  <Check className="size-4" />
                  <span>
                    {submitting ? "Confirmando..." : "Confirmar factura"}
                  </span>
                </span>
                <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px] font-normal">
                  F9
                </kbd>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {items.length === 0
                  ? "Agregá al menos un producto."
                  : modoComprador === "cliente" && !cliente
                    ? "Elegí un cliente o pasá a Consumidor final."
                    : "Al confirmar se verifica el stock, se descuenta y se asigna el número."}
              </p>

              {items.length > 0 && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={descartarVenta}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="size-3.5" />
                    Descartar venta
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal alta rápida de cliente sin perder la venta */}
      <ClienteFormDialog
        open={altaClienteOpen}
        onOpenChange={setAltaClienteOpen}
        viaApi
        onCreated={(nuevo) => {
          setCliente(nuevo);
          setModoComprador("cliente");
        }}
      />
    </div>
  );
}
