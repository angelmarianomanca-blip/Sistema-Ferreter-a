import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, pagos, usuarios } from "@/db/schema";
import type { AuthUser } from "@/lib/auth";
import { COMERCIO, MEDIOS_PAGO_LABELS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { formatNumeroRecibo } from "@/lib/format";
import { parseOrThrow } from "@/lib/http";
import { registrarPagoSchema } from "@/lib/schemas/pagos";
import {
  calcularSaldoCliente,
  registrarMovimientoCuenta,
} from "./clientes.service";

export interface PagoDTO {
  id: number;
  numeroRecibo: string;
  fecha: string;
  cliente: {
    id: number;
    nombre: string;
    tipoDoc: "DNI" | "CUIT";
    nroDoc: string;
  };
  importe: number;
  medio: "efectivo" | "transferencia" | "tarjeta_debito";
  observacion: string | null;
  usuario: { id: number; nombre: string };
  saldoCliente: number;
}

/**
 * RF-C5, Regla 4, Regla 8 y Regla 11:
 * Registra un pago a cuenta en una única transacción: verifica cuenta corriente habilitada,
 * impide superar la deuda (no hay saldos a favor), asigna número correlativo de recibo
 * y graba el crédito en `movimientos_cuenta`.
 */
export async function registrarPago(
  actor: AuthUser,
  clienteId: number,
  input: unknown,
  opts?: { fecha?: string }
): Promise<PagoDTO> {
  const data = parseOrThrow(registrarPagoSchema, input);
  const fecha = opts?.fecha ?? new Date().toISOString();
  const puntoVenta = COMERCIO.puntoVenta;

  return db.transaction(
    async (tx) => {
      const [cliente] = await tx
        .select()
        .from(clientes)
        .where(eq(clientes.id, clienteId))
        .limit(1);

      if (!cliente) {
        throw new ApiError(404, "NO_ENCONTRADO", "Cliente no encontrado.");
      }

      if (!cliente.cuentaCorriente) {
        throw new ApiError(
          422,
          "CUENTA_CORRIENTE_NO_HABILITADA",
          "El cliente no tiene cuenta corriente habilitada."
        );
      }

      const saldoActual = await calcularSaldoCliente(tx, clienteId);

      // Regla 8: Un pago no puede superar la deuda
      if (data.importe > saldoActual) {
        throw new ApiError(
          422,
          "PAGO_SUPERA_DEUDA",
          "El importe del pago no puede superar el saldo adeudado.",
          [
            {
              campo: "importe",
              mensaje: "No puede superar la deuda actual del cliente.",
            },
          ]
        );
      }

      // Regla 4: Numeración correlativa propia para recibos de pago
      const [maxRow] = await tx
        .select({
          maxNum: sql<number>`COALESCE(MAX(${pagos.numero}), 0)`,
        })
        .from(pagos)
        .where(eq(pagos.puntoVenta, puntoVenta));

      const numero = Number(maxRow?.maxNum ?? 0) + 1;
      const numeroRecibo = formatNumeroRecibo(puntoVenta, numero);

      const [inserted] = await tx
        .insert(pagos)
        .values({
          puntoVenta,
          numero,
          fecha,
          clienteId,
          usuarioId: actor.id,
          importe: data.importe,
          medio: data.medio,
          observacion: data.observacion ?? null,
          createdAt: fecha,
        })
        .returning();

      await registrarMovimientoCuenta(tx, {
        clienteId,
        tipo: "credito",
        importe: data.importe,
        descripcion: `Recibo ${numeroRecibo} · ${MEDIOS_PAGO_LABELS[data.medio]}`,
        pagoId: inserted.id,
        fecha,
      });

      return {
        id: inserted.id,
        numeroRecibo,
        fecha: inserted.fecha,
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          tipoDoc: cliente.tipoDoc,
          nroDoc: cliente.nroDoc,
        },
        importe: inserted.importe,
        medio: inserted.medio,
        observacion: inserted.observacion,
        usuario: { id: actor.id, nombre: actor.nombre },
        saldoCliente: saldoActual - data.importe,
      };
    },
    { behavior: "immediate" }
  );
}

/**
 * RF-C5: Obtiene el detalle completo de un recibo de pago para consulta o reimpresión.
 */
export async function obtenerPago(
  _actor: AuthUser,
  pagoId: number
): Promise<PagoDTO> {
  const [row] = await db
    .select({
      id: pagos.id,
      puntoVenta: pagos.puntoVenta,
      numero: pagos.numero,
      fecha: pagos.fecha,
      importe: pagos.importe,
      medio: pagos.medio,
      observacion: pagos.observacion,
      clienteId: clientes.id,
      clienteNombre: clientes.nombre,
      clienteTipoDoc: clientes.tipoDoc,
      clienteNroDoc: clientes.nroDoc,
      usuarioId: usuarios.id,
      usuarioNombre: usuarios.nombre,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .innerJoin(usuarios, eq(pagos.usuarioId, usuarios.id))
    .where(eq(pagos.id, pagoId))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NO_ENCONTRADO", "Recibo no encontrado.");
  }

  const saldoCliente = await calcularSaldoCliente(db, row.clienteId);

  return {
    id: row.id,
    numeroRecibo: formatNumeroRecibo(row.puntoVenta, row.numero),
    fecha: row.fecha,
    cliente: {
      id: row.clienteId,
      nombre: row.clienteNombre,
      tipoDoc: row.clienteTipoDoc,
      nroDoc: row.clienteNroDoc,
    },
    importe: row.importe,
    medio: row.medio,
    observacion: row.observacion,
    usuario: {
      id: row.usuarioId,
      nombre: row.usuarioNombre,
    },
    saldoCliente,
  };
}
