import { and, asc, desc, eq, gte, like, lt, lte, or, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { clientes, facturas, movimientosCuenta, type ClienteRow } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { ApiError, isSqliteUniqueError } from "@/lib/errors";
import {
  argentinaDayEndUtc,
  argentinaDayStartUtc,
  formatDocumento,
  formatNumeroFactura,
  normalizarDocumento,
} from "@/lib/format";
import { parseOrThrow } from "@/lib/http";
import {
  crearClienteSchema,
  cuentaCorrienteQuerySchema,
  editarClienteSchema,
  listarClientesSchema,
} from "@/lib/schemas/clientes";
import type { PaginatedResponse } from "@/lib/schemas/common";

export interface ClienteDTO {
  id: number;
  tipoDoc: "DNI" | "CUIT";
  nroDoc: string;
  nombre: string;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  cuentaCorriente: boolean;
  limiteCredito: number | null;
  saldo: number;
  disponible: number | null;
  activo: boolean;
}

export interface ClienteDetalleDTO extends ClienteDTO {
  ultimasFacturas: Array<{
    id: number;
    numeroFormateado: string;
    fecha: string;
    formaPago: "contado" | "tarjeta" | "cuenta_corriente";
    estado: "emitida" | "anulada";
    total: number;
  }>;
}

export interface CuentaCorrienteDTO {
  cliente: { id: number; nombre: string };
  saldoAnterior: number;
  movimientos: Array<{
    id: number;
    fecha: string;
    tipo: "debito" | "credito";
    importe: number;
    descripcion: string;
    facturaId: number | null;
    pagoId: number | null;
    saldo: number;
  }>;
  saldo: number;
}

export interface ListarClientesResult extends PaginatedResponse<ClienteDTO> {
  totalAdeudado?: number;
}

function toClienteDTO(row: ClienteRow, saldo: number): ClienteDTO {
  const disponible =
    row.limiteCredito !== null ? row.limiteCredito - saldo : null;
  return {
    id: row.id,
    tipoDoc: row.tipoDoc,
    nroDoc: row.nroDoc,
    nombre: row.nombre,
    domicilio: row.domicilio,
    telefono: row.telefono,
    email: row.email,
    cuentaCorriente: row.cuentaCorriente,
    limiteCredito: row.limiteCredito,
    saldo,
    disponible,
    activo: row.activo,
  };
}

/**
 * Regla 7 y Sección 10.2: Única fuente de verdad para el saldo de un cliente.
 * Saldo = débitos − créditos de su cuenta corriente.
 */
export async function calcularSaldoCliente(
  tx: DbOrTx,
  clienteId: number
): Promise<number> {
  const [row] = await tx
    .select({
      saldo: sql<number>`COALESCE(SUM(CASE WHEN ${movimientosCuenta.tipo} = 'debito' THEN ${movimientosCuenta.importe} ELSE -${movimientosCuenta.importe} END), 0)`,
    })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId));

  return Number(row?.saldo ?? 0);
}

/**
 * Calcula todos los saldos agrupados por cliente en una sola consulta.
 */
export async function calcularMapaSaldos(
  tx: DbOrTx
): Promise<Map<number, number>> {
  const rows = await tx
    .select({
      clienteId: movimientosCuenta.clienteId,
      saldo: sql<number>`COALESCE(SUM(CASE WHEN ${movimientosCuenta.tipo} = 'debito' THEN ${movimientosCuenta.importe} ELSE -${movimientosCuenta.importe} END), 0)`,
    })
    .from(movimientosCuenta)
    .groupBy(movimientosCuenta.clienteId);

  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.clienteId, Number(r.saldo));
  }
  return map;
}

/**
 * Registra un débito o crédito en la cuenta corriente dentro de una transacción.
 */
export async function registrarMovimientoCuenta(
  tx: DbOrTx,
  params: {
    clienteId: number;
    tipo: "debito" | "credito";
    importe: number;
    descripcion: string;
    facturaId?: number | null;
    pagoId?: number | null;
    fecha?: string;
  }
): Promise<void> {
  const fecha = params.fecha ?? new Date().toISOString();
  await tx.insert(movimientosCuenta).values({
    clienteId: params.clienteId,
    tipo: params.tipo,
    importe: params.importe,
    fecha,
    descripcion: params.descripcion,
    facturaId: params.facturaId ?? null,
    pagoId: params.pagoId ?? null,
    createdAt: fecha,
  });
}

/**
 * RF-C1 y RF-C6: Listado de clientes con búsqueda por nombre o documento
 * (ignorando puntos y guiones), filtro de deuda, orden y paginación.
 */
export async function listarClientes(
  _actor: AuthUser,
  query: unknown
): Promise<ListarClientesResult> {
  const { q, conDeuda, orden, activo, page, pageSize } = parseOrThrow(
    listarClientesSchema,
    query
  );

  const conditions = [];
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    const digits = normalizarDocumento(q);
    if (digits.length > 0) {
      conditions.push(
        or(
          like(clientes.nombre, pattern),
          like(clientes.nroDoc, pattern),
          like(clientes.nroDocNormalizado, `%${digits}%`)
        )
      );
    } else {
      conditions.push(
        or(like(clientes.nombre, pattern), like(clientes.nroDoc, pattern))
      );
    }
  }

  if (activo === "false") {
    conditions.push(eq(clientes.activo, false));
  } else if (activo !== "todos") {
    conditions.push(eq(clientes.activo, true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, saldosMap] = await Promise.all([
    db.select().from(clientes).where(where).orderBy(asc(clientes.nombre)),
    calcularMapaSaldos(db),
  ]);

  let list = rows.map((row) => toClienteDTO(row, saldosMap.get(row.id) ?? 0));

  let totalAdeudado: number | undefined;
  if (conDeuda === "true") {
    list = list.filter((c) => c.saldo > 0);
    totalAdeudado = list.reduce((acc, c) => acc + c.saldo, 0);
  }

  if (orden === "saldo") {
    list.sort((a, b) => b.saldo - a.saldo || a.nombre.localeCompare(b.nombre, "es"));
  } else {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  const total = list.length;
  const offset = (page - 1) * pageSize;
  const paged = list.slice(offset, offset + pageSize);

  return {
    data: paged,
    page,
    pageSize,
    total,
    ...(conDeuda === "true" ? { totalAdeudado } : {}),
  };
}

/**
 * Total adeudado en cuentas corrientes (para encabezado de Clientes).
 */
export async function obtenerResumenDeudaClientes(
  _actor: AuthUser
): Promise<{ totalAdeudado: number; clientesConSaldo: number }> {
  const saldosMap = await calcularMapaSaldos(db);
  let totalAdeudado = 0;
  let clientesConSaldo = 0;
  for (const saldo of saldosMap.values()) {
    if (saldo > 0) {
      totalAdeudado += saldo;
      clientesConSaldo += 1;
    }
  }
  return { totalAdeudado, clientesConSaldo };
}

/**
 * RF-C3: Ficha del cliente con saldo actual y sus 6 últimas facturas.
 */
export async function obtenerCliente(
  _actor: AuthUser,
  id: number
): Promise<ClienteDetalleDTO> {
  const [row] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const [saldo, ultimas] = await Promise.all([
    calcularSaldoCliente(db, id),
    db
      .select({
        id: facturas.id,
        puntoVenta: facturas.puntoVenta,
        numero: facturas.numero,
        fecha: facturas.fecha,
        formaPago: facturas.formaPago,
        estado: facturas.estado,
        total: facturas.total,
      })
      .from(facturas)
      .where(eq(facturas.clienteId, id))
      .orderBy(desc(facturas.fecha), desc(facturas.id))
      .limit(6),
  ]);

  return {
    ...toClienteDTO(row, saldo),
    ultimasFacturas: ultimas.map((f) => ({
      id: f.id,
      numeroFormateado: formatNumeroFactura(f.puntoVenta, f.numero),
      fecha: f.fecha,
      formaPago: f.formaPago,
      estado: f.estado,
      total: f.total,
    })),
  };
}

/**
 * RF-C2 y RF-V2: Alta de cliente (tanto desde Clientes como desde Nueva venta).
 */
export async function crearCliente(
  _actor: AuthUser,
  input: unknown
): Promise<ClienteDTO> {
  const data = parseOrThrow(crearClienteSchema, input);
  const nroDocNormalizado = normalizarDocumento(data.nroDoc);
  const nroDocFormateado = formatDocumento(data.tipoDoc, data.nroDoc);

  const dup = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.nroDocNormalizado, nroDocNormalizado))
    .limit(1);

  if (dup.length > 0) {
    throw new ApiError(
      409,
      "DOCUMENTO_DUPLICADO",
      "Ya existe un cliente con ese número de documento.",
      [{ campo: "nroDoc", mensaje: "Ya existe un cliente con ese documento." }]
    );
  }

  try {
    const [inserted] = await db
      .insert(clientes)
      .values({
        tipoDoc: data.tipoDoc,
        nroDoc: nroDocFormateado,
        nroDocNormalizado,
        nombre: data.nombre,
        domicilio: data.domicilio ?? null,
        telefono: data.telefono ?? null,
        email: data.email ?? null,
        cuentaCorriente: data.cuentaCorriente,
        limiteCredito: data.cuentaCorriente ? (data.limiteCredito ?? null) : null,
        activo: true,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return toClienteDTO(inserted, 0);
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      throw new ApiError(
        409,
        "DOCUMENTO_DUPLICADO",
        "Ya existe un cliente con ese número de documento.",
        [{ campo: "nroDoc", mensaje: "Ya existe un cliente con ese documento." }]
      );
    }
    throw err;
  }
}

/**
 * RF-C2 y RF-C7: Edición y baja lógica de cliente.
 * Sección 11.5: devuelve 422 SALDO_PENDIENTE si se desactiva o se le quita
 * la cuenta corriente con saldo distinto de cero.
 */
export async function editarCliente(
  _actor: AuthUser,
  id: number,
  input: unknown
): Promise<ClienteDTO> {
  const data = parseOrThrow(editarClienteSchema, input);

  const [current] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, id))
    .limit(1);

  if (!current) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  const saldo = await calcularSaldoCliente(db, id);

  if (data.activo === false && saldo !== 0) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "No se puede dar de baja un cliente con saldo pendiente en cuenta corriente."
    );
  }

  if (data.cuentaCorriente === false && saldo !== 0) {
    throw new ApiError(
      422,
      "SALDO_PENDIENTE",
      "No se puede deshabilitar la cuenta corriente mientras el cliente tenga saldo pendiente."
    );
  }

  const nextTipoDoc = data.tipoDoc ?? current.tipoDoc;
  const nextRawDoc = data.nroDoc ?? current.nroDoc;
  const nextNormalizado = normalizarDocumento(nextRawDoc);

  if (data.tipoDoc !== undefined || data.nroDoc !== undefined) {
    if (nextTipoDoc === "DNI" && (nextNormalizado.length < 7 || nextNormalizado.length > 8)) {
      throw new ApiError(422, "VALIDACION", "Hay campos con errores.", [
        { campo: "nroDoc", mensaje: "El DNI debe tener 7 u 8 dígitos." },
      ]);
    }
    if (nextTipoDoc === "CUIT" && nextNormalizado.length !== 11) {
      throw new ApiError(422, "VALIDACION", "Hay campos con errores.", [
        { campo: "nroDoc", mensaje: "El CUIT debe tener 11 dígitos." },
      ]);
    }
  }

  if (nextNormalizado !== current.nroDocNormalizado) {
    const dup = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.nroDocNormalizado, nextNormalizado))
      .limit(1);
    if (dup.length > 0) {
      throw new ApiError(
        409,
        "DOCUMENTO_DUPLICADO",
        "Ya existe un cliente con ese número de documento.",
        [{ campo: "nroDoc", mensaje: "Ya existe un cliente con ese documento." }]
      );
    }
  }

  const nextCuentaCorriente = data.cuentaCorriente ?? current.cuentaCorriente;
  const nextLimiteCredito = nextCuentaCorriente
    ? data.limiteCredito !== undefined
      ? data.limiteCredito
      : current.limiteCredito
    : null;

  const [updated] = await db
    .update(clientes)
    .set({
      tipoDoc: nextTipoDoc,
      nroDoc: formatDocumento(nextTipoDoc, nextRawDoc),
      nroDocNormalizado: nextNormalizado,
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.domicilio !== undefined ? { domicilio: data.domicilio } : {}),
      ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      cuentaCorriente: nextCuentaCorriente,
      limiteCredito: nextLimiteCredito,
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(clientes.id, id))
    .returning();

  return toClienteDTO(updated, saldo);
}

/**
 * RF-C4: Movimientos de cuenta corriente en orden cronológico con saldo acumulado
 * en cada renglón. Si `desde` recorta el historial, calcula `saldoAnterior`.
 */
export async function obtenerCuentaCorriente(
  _actor: AuthUser,
  clienteId: number,
  query: unknown
): Promise<CuentaCorrienteDTO> {
  const { desde, hasta } = parseOrThrow(cuentaCorrienteQuerySchema, query);

  const [cliente] = await db
    .select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);

  if (!cliente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
  }

  let saldoAnterior = 0;
  const conditions = [eq(movimientosCuenta.clienteId, clienteId)];

  if (desde) {
    const desdeUtc = argentinaDayStartUtc(desde);
    const [prevRow] = await db
      .select({
        saldo: sql<number>`COALESCE(SUM(CASE WHEN ${movimientosCuenta.tipo} = 'debito' THEN ${movimientosCuenta.importe} ELSE -${movimientosCuenta.importe} END), 0)`,
      })
      .from(movimientosCuenta)
      .where(
        and(
          eq(movimientosCuenta.clienteId, clienteId),
          lt(movimientosCuenta.fecha, desdeUtc)
        )
      );
    saldoAnterior = Number(prevRow?.saldo ?? 0);
    conditions.push(gte(movimientosCuenta.fecha, desdeUtc));
  }

  if (hasta) {
    conditions.push(lte(movimientosCuenta.fecha, argentinaDayEndUtc(hasta)));
  }

  const rows = await db
    .select()
    .from(movimientosCuenta)
    .where(and(...conditions))
    .orderBy(asc(movimientosCuenta.fecha), asc(movimientosCuenta.id));

  let acumulado = saldoAnterior;
  const movimientos = rows.map((r) => {
    acumulado += r.tipo === "debito" ? r.importe : -r.importe;
    return {
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      importe: r.importe,
      descripcion: r.descripcion,
      facturaId: r.facturaId,
      pagoId: r.pagoId,
      saldo: acumulado,
    };
  });

  return {
    cliente,
    saldoAnterior,
    movimientos,
    saldo: acumulado,
  };
}
