import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { facturaItems, facturas, productos } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import {
  argentinaDateStr,
  argentinaDayEndUtc,
  argentinaDayStartUtc,
  argentinaLastNDays,
  argentinaMonthStartStr,
} from "@/lib/format";
import { obtenerResumenDeudaClientes } from "./clientes.service";

export interface TableroDTO {
  hoy: { cantidad: number; importe: number };
  mes: { cantidad: number; importe: number; ticketPromedio: number };
  cuentasCorrientes: { totalAdeudado: number; clientesConSaldo: number };
  bajoMinimo: { cantidad: number };
  ventasDiarias: Array<{ fecha: string; importe: number }>;
  porFormaDePago: Array<{
    forma: "contado" | "tarjeta" | "cuenta_corriente";
    importe: number;
  }>;
  masVendidos: Array<{
    productoId: number;
    codigo: string;
    descripcion: string;
    unidades: number;
    importe: number;
  }>;
}

/**
 * RF-T1, RF-T2 y RF-T3 (Sección 11.7):
 * Indicadores del día y del mes en hora de Argentina, deuda total, productos bajo mínimo,
 * ventas diarias de los últimos 30 días (siempre 30 puntos sin huecos),
 * ventas del mes por forma de pago y los 5 productos más vendidos del mes por unidades.
 * Solo considera facturas con estado `emitida`.
 */
export async function obtenerTablero(actor: AuthUser): Promise<TableroDTO> {
  const now = new Date();
  const todayStr = argentinaDateStr(now);
  const todayStartUtc = argentinaDayStartUtc(todayStr);
  const todayEndUtc = argentinaDayEndUtc(todayStr);

  const monthStartStr = argentinaMonthStartStr(now);
  const monthStartUtc = argentinaDayStartUtc(monthStartStr);

  const last30Days = argentinaLastNDays(30, now);
  const range30StartUtc = argentinaDayStartUtc(last30Days[0]);

  const [
    [hoyAgg],
    [mesAgg],
    cuentasCorrientes,
    [bajoMinimoAgg],
    facturas30Dias,
    porFormaRows,
    masVendidosRows,
  ] = await Promise.all([
    db
      .select({
        cantidad: sql<number>`count(*)`,
        importe: sql<number>`COALESCE(SUM(${facturas.total}), 0)`,
      })
      .from(facturas)
      .where(
        and(
          eq(facturas.estado, "emitida"),
          gte(facturas.fecha, todayStartUtc),
          lte(facturas.fecha, todayEndUtc)
        )
      ),
    db
      .select({
        cantidad: sql<number>`count(*)`,
        importe: sql<number>`COALESCE(SUM(${facturas.total}), 0)`,
      })
      .from(facturas)
      .where(
        and(
          eq(facturas.estado, "emitida"),
          gte(facturas.fecha, monthStartUtc),
          lte(facturas.fecha, todayEndUtc)
        )
      ),
    obtenerResumenDeudaClientes(actor),
    db
      .select({ cantidad: sql<number>`count(*)` })
      .from(productos)
      .where(
        and(
          eq(productos.activo, true),
          lt(productos.existencia, productos.stockMinimo)
        )
      ),
    db
      .select({
        fecha: facturas.fecha,
        total: facturas.total,
      })
      .from(facturas)
      .where(
        and(
          eq(facturas.estado, "emitida"),
          gte(facturas.fecha, range30StartUtc),
          lte(facturas.fecha, todayEndUtc)
        )
      ),
    db
      .select({
        forma: facturas.formaPago,
        importe: sql<number>`COALESCE(SUM(${facturas.total}), 0)`,
      })
      .from(facturas)
      .where(
        and(
          eq(facturas.estado, "emitida"),
          gte(facturas.fecha, monthStartUtc),
          lte(facturas.fecha, todayEndUtc)
        )
      )
      .groupBy(facturas.formaPago),
    db
      .select({
        productoId: facturaItems.productoId,
        codigo: facturaItems.codigo,
        descripcion: facturaItems.descripcion,
        unidades: sql<number>`COALESCE(SUM(${facturaItems.cantidad}), 0)`,
        importe: sql<number>`COALESCE(SUM(${facturaItems.subtotal}), 0)`,
      })
      .from(facturaItems)
      .innerJoin(facturas, eq(facturaItems.facturaId, facturas.id))
      .where(
        and(
          eq(facturas.estado, "emitida"),
          gte(facturas.fecha, monthStartUtc),
          lte(facturas.fecha, todayEndUtc)
        )
      )
      .groupBy(
        facturaItems.productoId,
        facturaItems.codigo,
        facturaItems.descripcion
      )
      .orderBy(desc(sql`SUM(${facturaItems.cantidad})`), desc(sql`SUM(${facturaItems.subtotal})`))
      .limit(5),
  ]);

  const mesCantidad = Number(mesAgg?.cantidad ?? 0);
  const mesImporte = Number(mesAgg?.importe ?? 0);
  const ticketPromedio =
    mesCantidad > 0 ? Math.round(mesImporte / mesCantidad) : 0;

  // Agrupar ventas por día en hora de Argentina (siempre 30 elementos sin huecos)
  const porDiaMap = new Map<string, number>();
  for (const ymd of last30Days) {
    porDiaMap.set(ymd, 0);
  }
  for (const f of facturas30Dias) {
    const dayStr = argentinaDateStr(new Date(f.fecha));
    if (porDiaMap.has(dayStr)) {
      porDiaMap.set(dayStr, (porDiaMap.get(dayStr) ?? 0) + f.total);
    }
  }
  const ventasDiarias = last30Days.map((fecha) => ({
    fecha,
    importe: porDiaMap.get(fecha) ?? 0,
  }));

  const formasMap = new Map<string, number>();
  for (const r of porFormaRows) {
    formasMap.set(r.forma, Number(r.importe));
  }
  const porFormaDePago: TableroDTO["porFormaDePago"] = [
    { forma: "contado", importe: formasMap.get("contado") ?? 0 },
    { forma: "tarjeta", importe: formasMap.get("tarjeta") ?? 0 },
    { forma: "cuenta_corriente", importe: formasMap.get("cuenta_corriente") ?? 0 },
  ];

  return {
    hoy: {
      cantidad: Number(hoyAgg?.cantidad ?? 0),
      importe: Number(hoyAgg?.importe ?? 0),
    },
    mes: {
      cantidad: mesCantidad,
      importe: mesImporte,
      ticketPromedio,
    },
    cuentasCorrientes,
    bajoMinimo: {
      cantidad: Number(bajoMinimoAgg?.cantidad ?? 0),
    },
    ventasDiarias,
    porFormaDePago,
    masVendidos: masVendidosRows.map((r) => ({
      productoId: r.productoId,
      codigo: r.codigo,
      descripcion: r.descripcion,
      unidades: Number(r.unidades),
      importe: Number(r.importe),
    })),
  };
}
