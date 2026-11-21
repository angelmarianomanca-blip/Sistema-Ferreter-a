import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { facturas, movimientosStock, productos, usuarios } from "@/db/schema";
import { assertAdmin, type AuthUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import {
  argentinaDayEndUtc,
  argentinaDayStartUtc,
  formatNumeroFactura,
} from "@/lib/format";
import { parseOrThrow } from "@/lib/http";
import type { PaginatedResponse } from "@/lib/schemas/common";
import {
  listarMovimientosStockSchema,
  registrarMovimientoStockSchema,
} from "@/lib/schemas/stock";

export interface MovimientoStockDTO {
  id: number;
  producto: { id: number; codigo: string; descripcion: string };
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number;
  existenciaResultante: number;
  motivo: string;
  observacion: string | null;
  referencia: { facturaId: number; numero: string } | null;
  usuario: { id: number; nombre: string };
  fecha: string;
}

export interface MoverStockParams {
  productoId: number;
  usuarioId: number;
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  cantidad: number; // con signo: positivo para ingreso/anulacion, negativo para venta/egreso
  motivo: string;
  observacion?: string | null;
  facturaId?: number | null;
  fecha?: string;
}

/**
 * Sección 10.2, Regla 1 y Regla 2:
 * ÚNICA función del sistema que modifica `productos.existencia`.
 * Actualiza con condición atómica (`WHERE existencia >= ?`) para egresos/ventas
 * y graba el movimiento en `movimientos_stock` dentro de la misma transacción.
 */
export async function moverStock(
  tx: DbOrTx,
  params: MoverStockParams
): Promise<{ movimientoId: number; existenciaResultante: number; fecha: string }> {
  const {
    productoId,
    usuarioId,
    tipo,
    cantidad,
    motivo,
    observacion = null,
    facturaId = null,
  } = params;
  const fecha = params.fecha ?? new Date().toISOString();

  if (cantidad === 0 || !Number.isInteger(cantidad)) {
    throw new ApiError(422, "VALIDACION", "La cantidad debe ser un entero distinto de cero.");
  }

  let existenciaResultante: number;

  if (cantidad < 0) {
    const requerido = Math.abs(cantidad);
    // Regla 1: actualización condicional atómica para evitar stock negativo bajo concurrencia
    const updated = await tx
      .update(productos)
      .set({ existencia: sql`${productos.existencia} - ${requerido}` })
      .where(
        and(eq(productos.id, productoId), gte(productos.existencia, requerido))
      )
      .returning({ existencia: productos.existencia });

    if (updated.length === 0) {
      const [prod] = await tx
        .select({ id: productos.id, existencia: productos.existencia })
        .from(productos)
        .where(eq(productos.id, productoId))
        .limit(1);

      if (!prod) {
        throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
      }

      throw new ApiError(
        409,
        "STOCK_INSUFICIENTE",
        `Stock insuficiente. Disponible: ${prod.existencia}, solicitado: ${requerido}.`,
        [
          {
            productoId,
            solicitado: requerido,
            disponible: prod.existencia,
          },
        ]
      );
    }

    existenciaResultante = updated[0].existencia;
  } else {
    const updated = await tx
      .update(productos)
      .set({ existencia: sql`${productos.existencia} + ${cantidad}` })
      .where(eq(productos.id, productoId))
      .returning({ existencia: productos.existencia });

    if (updated.length === 0) {
      throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
    }

    existenciaResultante = updated[0].existencia;
  }

  const [mov] = await tx
    .insert(movimientosStock)
    .values({
      productoId,
      usuarioId,
      facturaId,
      tipo,
      cantidad,
      existenciaResultante,
      motivo,
      observacion,
      fecha,
      createdAt: fecha,
    })
    .returning({ id: movimientosStock.id });

  return {
    movimientoId: mov.id,
    existenciaResultante,
    fecha,
  };
}

/**
 * RF-P4 y RF-P5: Ingreso o egreso manual de stock (solo administrador).
 * El signo de la cantidad lo asigna el servidor según el tipo.
 */
export async function registrarMovimientoManual(
  actor: AuthUser,
  productoId: number,
  input: unknown,
  opts?: { fecha?: string }
): Promise<MovimientoStockDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(registrarMovimientoStockSchema, input);

  const result = await db.transaction(
    async (tx) => {
      const [prod] = await tx
        .select({
          id: productos.id,
          codigo: productos.codigo,
          descripcion: productos.descripcion,
        })
        .from(productos)
        .where(eq(productos.id, productoId))
        .limit(1);

      if (!prod) {
        throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
      }

      const cantidadConSigno =
        data.tipo === "ingreso" ? data.cantidad : -data.cantidad;

      const moved = await moverStock(tx, {
        productoId,
        usuarioId: actor.id,
        tipo: data.tipo,
        cantidad: cantidadConSigno,
        motivo: data.motivo,
        observacion: data.observacion ?? null,
        fecha: opts?.fecha,
      });

      return {
        id: moved.movimientoId,
        producto: prod,
        tipo: data.tipo,
        cantidad: cantidadConSigno,
        existenciaResultante: moved.existenciaResultante,
        motivo: data.motivo,
        observacion: data.observacion ?? null,
        referencia: null,
        usuario: { id: actor.id, nombre: actor.nombre },
        fecha: moved.fecha,
      } satisfies MovimientoStockDTO;
    },
    { behavior: "immediate" }
  );

  return result;
}

/**
 * RF-P6: Historial general de movimientos de stock, con filtros por producto, tipo y fechas.
 */
export async function listarMovimientosStock(
  _actor: AuthUser,
  query: unknown
): Promise<PaginatedResponse<MovimientoStockDTO>> {
  const { productoId, tipo, desde, hasta, page, pageSize } = parseOrThrow(
    listarMovimientosStockSchema,
    query
  );

  const conditions = [];
  if (productoId !== undefined) {
    conditions.push(eq(movimientosStock.productoId, productoId));
  }
  if (tipo !== undefined) {
    conditions.push(eq(movimientosStock.tipo, tipo));
  }
  if (desde) {
    conditions.push(gte(movimientosStock.fecha, argentinaDayStartUtc(desde)));
  }
  if (hasta) {
    conditions.push(lte(movimientosStock.fecha, argentinaDayEndUtc(hasta)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: movimientosStock.id,
        tipo: movimientosStock.tipo,
        cantidad: movimientosStock.cantidad,
        existenciaResultante: movimientosStock.existenciaResultante,
        motivo: movimientosStock.motivo,
        observacion: movimientosStock.observacion,
        fecha: movimientosStock.fecha,
        productoId: productos.id,
        productoCodigo: productos.codigo,
        productoDescripcion: productos.descripcion,
        usuarioId: usuarios.id,
        usuarioNombre: usuarios.nombre,
        facturaId: facturas.id,
        facturaPuntoVenta: facturas.puntoVenta,
        facturaNumero: facturas.numero,
      })
      .from(movimientosStock)
      .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
      .innerJoin(usuarios, eq(movimientosStock.usuarioId, usuarios.id))
      .leftJoin(facturas, eq(movimientosStock.facturaId, facturas.id))
      .where(where)
      .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(movimientosStock)
      .where(where),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      producto: {
        id: r.productoId,
        codigo: r.productoCodigo,
        descripcion: r.productoDescripcion,
      },
      tipo: r.tipo,
      cantidad: r.cantidad,
      existenciaResultante: r.existenciaResultante,
      motivo: r.motivo,
      observacion: r.observacion,
      referencia:
        r.facturaId !== null &&
        r.facturaPuntoVenta !== null &&
        r.facturaNumero !== null
          ? {
              facturaId: r.facturaId,
              numero: formatNumeroFactura(r.facturaPuntoVenta, r.facturaNumero),
            }
          : null,
      usuario: {
        id: r.usuarioId,
        nombre: r.usuarioNombre,
      },
      fecha: r.fecha,
    })),
    page,
    pageSize,
    total: Number(count),
  };
}

/**
 * RF-P6: Historial de movimientos de un producto puntual, del más nuevo al más viejo.
 */
export async function listarMovimientosProducto(
  actor: AuthUser,
  productoId: number,
  query: unknown
): Promise<PaginatedResponse<MovimientoStockDTO>> {
  const [prod] = await db
    .select({ id: productos.id })
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);

  if (!prod) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  const baseQuery =
    query && typeof query === "object"
      ? { ...(query as Record<string, unknown>), productoId }
      : { productoId };

  return listarMovimientosStock(actor, baseQuery);
}
