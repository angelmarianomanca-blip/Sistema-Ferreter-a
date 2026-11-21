import { and, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  facturaItems,
  facturas,
  productos,
  usuarios,
} from "@/db/schema";
import { assertAdmin, type AuthUser } from "@/lib/auth";
import { COMERCIO } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import {
  argentinaDayEndUtc,
  argentinaDayStartUtc,
  formatNumeroFactura,
} from "@/lib/format";
import { parseOrThrow } from "@/lib/http";
import type { PaginatedResponse } from "@/lib/schemas/common";
import {
  anularFacturaSchema,
  emitirFacturaSchema,
  listarFacturasSchema,
} from "@/lib/schemas/facturas";
import {
  calcularSaldoCliente,
  registrarMovimientoCuenta,
} from "./clientes.service";
import { moverStock } from "./stock.service";

export type PagoFacturaDTO =
  | { forma: "contado"; montoRecibido: number; vuelto: number }
  | {
      forma: "tarjeta";
      tarjeta: { tipo: "debito" | "credito"; marca: string; ultimos4: string };
    }
  | { forma: "cuenta_corriente" };

export interface FacturaResumenDTO {
  id: number;
  puntoVenta: number;
  numero: number;
  numeroFormateado: string;
  fecha: string;
  estado: "emitida" | "anulada";
  cliente: { id: number; nombre: string } | null;
  vendedor: { id: number; nombre: string };
  formaPago: "contado" | "tarjeta" | "cuenta_corriente";
  total: number;
}

export interface FacturaDetalleDTO {
  id: number;
  puntoVenta: number;
  numero: number;
  numeroFormateado: string;
  fecha: string;
  estado: "emitida" | "anulada";
  cliente: {
    id: number;
    nombre: string;
    tipoDoc: "DNI" | "CUIT";
    nroDoc: string;
    domicilio: string | null;
  } | null;
  vendedor: { id: number; nombre: string };
  items: Array<{
    productoId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }>;
  total: number;
  pago: PagoFacturaDTO;
  saldoCliente?: number;
  anulacion?: {
    fecha: string;
    usuario: { id: number; nombre: string };
    motivo: string;
  };
}

export interface ListarFacturasResult
  extends PaginatedResponse<FacturaResumenDTO> {
  totalEmitido: number;
}

/**
 * RF-V1 y Sección 11.6: Número orientativo de la próxima factura.
 * El número real se asigna recién al confirmar dentro de la transacción.
 */
export async function obtenerProximoNumero(
  _actor: AuthUser
): Promise<{ numeroFormateado: string }> {
  const pv = COMERCIO.puntoVenta;
  const [row] = await db
    .select({ maxNum: sql<number>`COALESCE(MAX(${facturas.numero}), 0)` })
    .from(facturas)
    .where(eq(facturas.puntoVenta, pv));

  const next = Number(row?.maxNum ?? 0) + 1;
  return { numeroFormateado: formatNumeroFactura(pv, next) };
}

/**
 * RF-V1 a RF-V6 y Reglas 1, 2, 3, 4, 6, 7, 9, 10, 11:
 * Emite una factura en una única transacción atómica (`BEGIN IMMEDIATE`):
 * valida productos activos, cliente/cuenta corriente, stock disponible, precios del catálogo,
 * monto recibido o límite de crédito, asigna número correlativo, graba factura + renglones,
 * descuenta stock vía `moverStock()` y registra débito en cuenta corriente si corresponde.
 */
export async function emitirFactura(
  actor: AuthUser,
  input: unknown,
  opts?: { fecha?: string }
): Promise<FacturaDetalleDTO> {
  const data = parseOrThrow(emitirFacturaSchema, input);
  const fecha = opts?.fecha ?? new Date().toISOString();
  const puntoVenta = COMERCIO.puntoVenta;

  return db.transaction(
    async (tx) => {
      // 1. Validar que los productos existan y estén activos
      const productIds = data.items.map((i) => i.productoId);
      const prodRows = await tx
        .select()
        .from(productos)
        .where(inArray(productos.id, productIds));

      const prodMap = new Map(prodRows.map((p) => [p.id, p]));
      for (const item of data.items) {
        const prod = prodMap.get(item.productoId);
        if (!prod) {
          throw new ApiError(
            404,
            "NO_ENCONTRADO",
            `El producto #${item.productoId} no existe.`
          );
        }
        if (!prod.activo) {
          throw new ApiError(
            422,
            "PRODUCTO_INACTIVO",
            `El producto ${prod.codigo} (${prod.descripcion}) está dado de baja.`
          );
        }
      }

      // 2. Validar cliente y habilitación para cuenta corriente (Regla 6)
      let clienteRow: typeof clientes.$inferSelect | null = null;
      if (data.clienteId !== null) {
        const [cli] = await tx
          .select()
          .from(clientes)
          .where(eq(clientes.id, data.clienteId))
          .limit(1);

        if (!cli) {
          throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
        }
        if (!cli.activo) {
          throw new ApiError(
            422,
            "VALIDACION",
            "El cliente seleccionado está dado de baja.",
            [{ campo: "clienteId", mensaje: "El cliente está inactivo." }]
          );
        }
        clienteRow = cli;
      }

      if (data.pago.forma === "cuenta_corriente") {
        if (!clienteRow || !clienteRow.cuentaCorriente) {
          throw new ApiError(
            422,
            "CUENTA_CORRIENTE_NO_HABILITADA",
            "Solo clientes registrados con cuenta corriente habilitada pueden comprar a cuenta."
          );
        }
      }

      // 3. Comprobar existencias de todos los ítems antes de descontar
      const faltantes: Array<{
        productoId: number;
        solicitado: number;
        disponible: number;
      }> = [];
      for (const item of data.items) {
        const prod = prodMap.get(item.productoId)!;
        if (prod.existencia < item.cantidad) {
          faltantes.push({
            productoId: prod.id,
            solicitado: item.cantidad,
            disponible: prod.existencia,
          });
        }
      }
      if (faltantes.length > 0) {
        throw new ApiError(
          409,
          "STOCK_INSUFICIENTE",
          "No hay existencia suficiente para uno o más productos.",
          faltantes
        );
      }

      // 4. Congelar precios actuales del catálogo y calcular total (Regla 3 y 10)
      let total = 0;
      const itemsPreparados = data.items.map((item) => {
        const prod = prodMap.get(item.productoId)!;
        const subtotal = prod.precio * item.cantidad;
        total += subtotal;
        return {
          productoId: prod.id,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          cantidad: item.cantidad,
          precioUnitario: prod.precio,
          subtotal,
        };
      });

      // 5. Validar forma de pago (monto recibido o límite de crédito, Regla 7)
      let montoRecibido: number | null = null;
      let vuelto: number | null = null;
      let tarjetaTipo: "debito" | "credito" | null = null;
      let tarjetaMarca: string | null = null;
      let tarjetaUltimos4: string | null = null;
      let saldoNuevoCliente: number | undefined;

      if (data.pago.forma === "contado") {
        montoRecibido =
          data.pago.montoRecibido !== undefined ? data.pago.montoRecibido : total;
        if (montoRecibido < total) {
          throw new ApiError(
            422,
            "MONTO_INSUFICIENTE",
            "El monto recibido no cubre el total de la factura.",
            [
              {
                campo: "pago.montoRecibido",
                mensaje: "El monto recibido debe ser mayor o igual al total.",
              },
            ]
          );
        }
        vuelto = montoRecibido - total;
      } else if (data.pago.forma === "tarjeta") {
        // Regla 9: solo tipo, marca y últimos 4 dígitos
        tarjetaTipo = data.pago.tarjeta.tipo;
        tarjetaMarca = data.pago.tarjeta.marca;
        tarjetaUltimos4 = data.pago.tarjeta.ultimos4;
      } else if (data.pago.forma === "cuenta_corriente" && clienteRow) {
        const saldoActual = await calcularSaldoCliente(tx, clienteRow.id);
        saldoNuevoCliente = saldoActual + total;
        if (
          clienteRow.limiteCredito !== null &&
          saldoNuevoCliente > clienteRow.limiteCredito
        ) {
          throw new ApiError(
            422,
            "LIMITE_CREDITO_EXCEDIDO",
            "La venta supera el límite de crédito del cliente.",
            {
              saldoActual,
              limite: clienteRow.limiteCredito,
              excedente: saldoNuevoCliente - clienteRow.limiteCredito,
            }
          );
        }
      }

      // 6. Asignar próximo número correlativo (Regla 4)
      const [maxRow] = await tx
        .select({ maxNum: sql<number>`COALESCE(MAX(${facturas.numero}), 0)` })
        .from(facturas)
        .where(eq(facturas.puntoVenta, puntoVenta));

      const numero = Number(maxRow?.maxNum ?? 0) + 1;
      const numeroFormateado = formatNumeroFactura(puntoVenta, numero);

      // 7. Grabar factura y renglones
      const [insertedFactura] = await tx
        .insert(facturas)
        .values({
          puntoVenta,
          numero,
          fecha,
          clienteId: clienteRow ? clienteRow.id : null,
          usuarioId: actor.id,
          total,
          formaPago: data.pago.forma,
          montoRecibido,
          vuelto,
          tarjetaTipo,
          tarjetaMarca,
          tarjetaUltimos4,
          estado: "emitida",
          createdAt: fecha,
        })
        .returning();

      await tx.insert(facturaItems).values(
        itemsPreparados.map((it) => ({
          facturaId: insertedFactura.id,
          productoId: it.productoId,
          codigo: it.codigo,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          subtotal: it.subtotal,
          createdAt: fecha,
        }))
      );

      // 8. Descontar existencias y grabar movimientos de stock atómicamente (Regla 1 y 2)
      for (const it of itemsPreparados) {
        await moverStock(tx, {
          productoId: it.productoId,
          usuarioId: actor.id,
          tipo: "venta",
          cantidad: -it.cantidad,
          motivo: "Venta",
          facturaId: insertedFactura.id,
          fecha,
        });
      }

      // 9. Grabar débito en cuenta corriente si corresponde
      if (data.pago.forma === "cuenta_corriente" && clienteRow) {
        await registrarMovimientoCuenta(tx, {
          clienteId: clienteRow.id,
          tipo: "debito",
          importe: total,
          descripcion: `Factura ${numeroFormateado}`,
          facturaId: insertedFactura.id,
          fecha,
        });
      }

      const pagoDto: PagoFacturaDTO =
        data.pago.forma === "contado"
          ? {
              forma: "contado",
              montoRecibido: montoRecibido!,
              vuelto: vuelto!,
            }
          : data.pago.forma === "tarjeta"
            ? {
                forma: "tarjeta",
                tarjeta: {
                  tipo: tarjetaTipo!,
                  marca: tarjetaMarca!,
                  ultimos4: tarjetaUltimos4!,
                },
              }
            : { forma: "cuenta_corriente" };

      return {
        id: insertedFactura.id,
        puntoVenta,
        numero,
        numeroFormateado,
        fecha: insertedFactura.fecha,
        estado: "emitida",
        cliente: clienteRow
          ? {
              id: clienteRow.id,
              nombre: clienteRow.nombre,
              tipoDoc: clienteRow.tipoDoc,
              nroDoc: clienteRow.nroDoc,
              domicilio: clienteRow.domicilio,
            }
          : null,
        vendedor: { id: actor.id, nombre: actor.nombre },
        items: itemsPreparados,
        total,
        pago: pagoDto,
        ...(saldoNuevoCliente !== undefined
          ? { saldoCliente: saldoNuevoCliente }
          : {}),
      };
    },
    { behavior: "immediate" }
  );
}

/**
 * RF-V8: Listado paginado de facturas con filtros por búsqueda (número o cliente),
 * rango de fechas (Argentina), cliente, vendedor, forma de pago y estado.
 * Incluye `totalEmitido` con la suma de las facturas emitidas que cumplen el filtro.
 */
export async function listarFacturas(
  _actor: AuthUser,
  query: unknown
): Promise<ListarFacturasResult> {
  const { q, desde, hasta, clienteId, vendedorId, forma, estado, page, pageSize } =
    parseOrThrow(listarFacturasSchema, query);

  const conditions = [];
  if (desde) {
    conditions.push(gte(facturas.fecha, argentinaDayStartUtc(desde)));
  }
  if (hasta) {
    conditions.push(lte(facturas.fecha, argentinaDayEndUtc(hasta)));
  }
  if (clienteId !== undefined) {
    conditions.push(eq(facturas.clienteId, clienteId));
  }
  if (vendedorId !== undefined) {
    conditions.push(eq(facturas.usuarioId, vendedorId));
  }
  if (forma !== undefined) {
    conditions.push(eq(facturas.formaPago, forma));
  }
  if (estado !== undefined) {
    conditions.push(eq(facturas.estado, estado));
  }
  if (q && q.length > 0) {
    const trimmed = q.trim();
    const pattern = `%${trimmed}%`;
    const numDigits = trimmed.replace(/\D/g, "");
    const qParts = [
      like(clientes.nombre, pattern),
      sql`printf('%04d-%08d', ${facturas.puntoVenta}, ${facturas.numero}) LIKE ${pattern}`,
    ];
    if (numDigits.length > 0) {
      qParts.push(sql`CAST(${facturas.numero} AS TEXT) LIKE ${`%${numDigits}%`}`);
    }
    if ("consumidor final".includes(trimmed.toLowerCase())) {
      qParts.push(sql`${facturas.clienteId} IS NULL`);
    }
    conditions.push(or(...qParts));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, [agg]] = await Promise.all([
    db
      .select({
        id: facturas.id,
        puntoVenta: facturas.puntoVenta,
        numero: facturas.numero,
        fecha: facturas.fecha,
        estado: facturas.estado,
        formaPago: facturas.formaPago,
        total: facturas.total,
        clienteId: clientes.id,
        clienteNombre: clientes.nombre,
        vendedorId: usuarios.id,
        vendedorNombre: usuarios.nombre,
      })
      .from(facturas)
      .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
      .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
      .where(where)
      .orderBy(desc(facturas.fecha), desc(facturas.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({
        count: sql<number>`count(*)`,
        totalEmitido: sql<number>`COALESCE(SUM(CASE WHEN ${facturas.estado} = 'emitida' THEN ${facturas.total} ELSE 0 END), 0)`,
      })
      .from(facturas)
      .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
      .where(where),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      puntoVenta: r.puntoVenta,
      numero: r.numero,
      numeroFormateado: formatNumeroFactura(r.puntoVenta, r.numero),
      fecha: r.fecha,
      estado: r.estado,
      cliente:
        r.clienteId !== null && r.clienteNombre !== null
          ? { id: r.clienteId, nombre: r.clienteNombre }
          : null,
      vendedor: { id: r.vendedorId, nombre: r.vendedorNombre },
      formaPago: r.formaPago,
      total: r.total,
    })),
    page,
    pageSize,
    total: Number(agg?.count ?? 0),
    totalEmitido: Number(agg?.totalEmitido ?? 0),
  };
}

/**
 * RF-V7: Detalle completo de una factura (comprobante imprimible).
 * Si está anulada, incluye el objeto `anulacion` con fecha, usuario y motivo.
 */
export async function obtenerFactura(
  _actor: AuthUser,
  id: number
): Promise<FacturaDetalleDTO> {
  const [row] = await db
    .select({
      id: facturas.id,
      puntoVenta: facturas.puntoVenta,
      numero: facturas.numero,
      fecha: facturas.fecha,
      estado: facturas.estado,
      formaPago: facturas.formaPago,
      total: facturas.total,
      montoRecibido: facturas.montoRecibido,
      vuelto: facturas.vuelto,
      tarjetaTipo: facturas.tarjetaTipo,
      tarjetaMarca: facturas.tarjetaMarca,
      tarjetaUltimos4: facturas.tarjetaUltimos4,
      motivoAnulacion: facturas.motivoAnulacion,
      fechaAnulacion: facturas.fechaAnulacion,
      usuarioAnulacionId: facturas.usuarioAnulacionId,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      clienteTipoDoc: clientes.tipoDoc,
      clienteNroDoc: clientes.nroDoc,
      clienteDomicilio: clientes.domicilio,
      vendedorId: usuarios.id,
      vendedorNombre: usuarios.nombre,
    })
    .from(facturas)
    .leftJoin(clientes, eq(facturas.clienteId, clientes.id))
    .innerJoin(usuarios, eq(facturas.usuarioId, usuarios.id))
    .where(eq(facturas.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
  }

  const items = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: facturaItems.codigo,
      descripcion: facturaItems.descripcion,
      cantidad: facturaItems.cantidad,
      precioUnitario: facturaItems.precioUnitario,
      subtotal: facturaItems.subtotal,
    })
    .from(facturaItems)
    .where(eq(facturaItems.facturaId, id));

  let saldoCliente: number | undefined;
  if (row.formaPago === "cuenta_corriente" && row.clienteId !== null) {
    saldoCliente = await calcularSaldoCliente(db, row.clienteId);
  }

  let anulacion: FacturaDetalleDTO["anulacion"];
  if (
    row.estado === "anulada" &&
    row.fechaAnulacion &&
    row.motivoAnulacion &&
    row.usuarioAnulacionId
  ) {
    const [anulador] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, row.usuarioAnulacionId))
      .limit(1);
    anulacion = {
      fecha: row.fechaAnulacion,
      usuario: anulador ?? { id: row.usuarioAnulacionId, nombre: "Administrador" },
      motivo: row.motivoAnulacion,
    };
  }

  const pagoDto: PagoFacturaDTO =
    row.formaPago === "contado"
      ? {
          forma: "contado",
          montoRecibido: row.montoRecibido ?? row.total,
          vuelto: row.vuelto ?? 0,
        }
      : row.formaPago === "tarjeta"
        ? {
            forma: "tarjeta",
            tarjeta: {
              tipo: row.tarjetaTipo ?? "debito",
              marca: row.tarjetaMarca ?? "",
              ultimos4: row.tarjetaUltimos4 ?? "0000",
            },
          }
        : { forma: "cuenta_corriente" };

  return {
    id: row.id,
    puntoVenta: row.puntoVenta,
    numero: row.numero,
    numeroFormateado: formatNumeroFactura(row.puntoVenta, row.numero),
    fecha: row.fecha,
    estado: row.estado,
    cliente:
      row.clienteId !== null &&
      row.clienteNombre !== null &&
      row.clienteTipoDoc !== null &&
      row.clienteNroDoc !== null
        ? {
            id: row.clienteId,
            nombre: row.clienteNombre,
            tipoDoc: row.clienteTipoDoc,
            nroDoc: row.clienteNroDoc,
            domicilio: row.clienteDomicilio,
          }
        : null,
    vendedor: { id: row.vendedorId, nombre: row.vendedorNombre },
    items,
    total: row.total,
    pago: pagoDto,
    ...(saldoCliente !== undefined ? { saldoCliente } : {}),
    ...(anulacion ? { anulacion } : {}),
  };
}

/**
 * RF-V9 y Regla 5: Anulación de factura (solo administrador, motivo obligatorio).
 * En una transacción: marca como anulada, reingresa stock de cada renglón
 * vía `moverStock()` y, si fue en cuenta corriente, registra crédito por el total.
 */
export async function anularFactura(
  actor: AuthUser,
  id: number,
  input: unknown,
  opts?: { fecha?: string }
): Promise<FacturaDetalleDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(anularFacturaSchema, input);
  const fecha = opts?.fecha ?? new Date().toISOString();

  await db.transaction(
    async (tx) => {
      const [fac] = await tx
        .select()
        .from(facturas)
        .where(eq(facturas.id, id))
        .limit(1);

      if (!fac) {
        throw new ApiError(404, "NO_ENCONTRADO", "Factura no encontrada.");
      }

      if (fac.estado === "anulada") {
        throw new ApiError(
          409,
          "FACTURA_ANULADA",
          "La factura ya se encuentra anulada."
        );
      }

      const numeroFormateado = formatNumeroFactura(fac.puntoVenta, fac.numero);

      await tx
        .update(facturas)
        .set({
          estado: "anulada",
          motivoAnulacion: data.motivo,
          fechaAnulacion: fecha,
          usuarioAnulacionId: actor.id,
        })
        .where(eq(facturas.id, id));

      const items = await tx
        .select()
        .from(facturaItems)
        .where(eq(facturaItems.facturaId, id));

      for (const it of items) {
        await moverStock(tx, {
          productoId: it.productoId,
          usuarioId: actor.id,
          tipo: "anulacion",
          cantidad: it.cantidad, // positivo: reingresa stock
          motivo: `Anulación factura ${numeroFormateado}`,
          observacion: data.motivo,
          facturaId: id,
          fecha,
        });
      }

      if (fac.formaPago === "cuenta_corriente" && fac.clienteId !== null) {
        await registrarMovimientoCuenta(tx, {
          clienteId: fac.clienteId,
          tipo: "credito",
          importe: fac.total,
          descripcion: `Anulación factura ${numeroFormateado}`,
          facturaId: id,
          fecha,
        });
      }
    },
    { behavior: "immediate" }
  );

  return obtenerFactura(actor, id);
}
