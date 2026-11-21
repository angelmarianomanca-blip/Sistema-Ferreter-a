import { z } from "zod";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO } from "@/lib/constants";
import { paginationQuerySchema, ymdSchema } from "./common";

export const registrarMovimientoStockSchema = z
  .object({
    tipo: z.enum(["ingreso", "egreso"], {
      message: "El tipo debe ser ingreso o egreso.",
    }),
    cantidad: z.coerce
      .number({ required_error: "La cantidad es obligatoria." })
      .int("Debe ser un número entero.")
      .positive("La cantidad debe ser mayor que cero."),
    motivo: z
      .string({ required_error: "El motivo es obligatorio." })
      .trim()
      .min(1, "El motivo es obligatorio."),
    observacion: z
      .string()
      .trim()
      .max(300, "Máximo 300 caracteres.")
      .optional()
      .nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.tipo === "ingreso" &&
      !(MOTIVOS_INGRESO as readonly string[]).includes(data.motivo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: `Motivo inválido para ingreso. Usá: ${MOTIVOS_INGRESO.join(", ")}.`,
      });
    }
    if (
      data.tipo === "egreso" &&
      !(MOTIVOS_EGRESO as readonly string[]).includes(data.motivo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivo"],
        message: `Motivo inválido para egreso. Usá: ${MOTIVOS_EGRESO.join(", ")}.`,
      });
    }
  });

export const listarMovimientosStockSchema = paginationQuerySchema.extend({
  productoId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(["venta", "anulacion", "ingreso", "egreso"]).optional(),
  desde: ymdSchema.optional(),
  hasta: ymdSchema.optional(),
});

export type RegistrarMovimientoStockInput = z.infer<
  typeof registrarMovimientoStockSchema
>;
export type ListarMovimientosStockInput = z.infer<
  typeof listarMovimientosStockSchema
>;
