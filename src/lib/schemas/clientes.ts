import { z } from "zod";
import { normalizarDocumento } from "@/lib/format";
import { paginationQuerySchema, ymdSchema } from "./common";

const tipoDocEnum = z.enum(["DNI", "CUIT"], {
  message: "Elegí DNI o CUIT.",
});

const optionalText = z
  .string()
  .trim()
  .max(200, "Máximo 200 caracteres.")
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null))
  .refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Ingresá un email válido."
  );

export const crearClienteSchema = z
  .object({
    tipoDoc: tipoDocEnum,
    nroDoc: z
      .string({ required_error: "El número de documento es obligatorio." })
      .trim()
      .min(1, "El número de documento es obligatorio."),
    nombre: z
      .string({ required_error: "El nombre o razón social es obligatorio." })
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(160, "Máximo 160 caracteres."),
    domicilio: optionalText,
    telefono: optionalText,
    email: optionalEmail,
    cuentaCorriente: z.boolean().default(false),
    limiteCredito: z
      .number()
      .int("El límite debe expresarse en centavos enteros.")
      .positive("El límite de crédito debe ser mayor que cero.")
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const digits = normalizarDocumento(data.nroDoc);
    if (data.tipoDoc === "DNI" && (digits.length < 7 || digits.length > 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nroDoc"],
        message: "El DNI debe tener 7 u 8 dígitos.",
      });
    }
    if (data.tipoDoc === "CUIT" && digits.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nroDoc"],
        message: "El CUIT debe tener 11 dígitos.",
      });
    }
  });

export const editarClienteSchema = z
  .object({
    tipoDoc: tipoDocEnum.optional(),
    nroDoc: z.string().trim().min(1, "El número de documento es obligatorio.").optional(),
    nombre: z
      .string()
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(160, "Máximo 160 caracteres.")
      .optional(),
    domicilio: optionalText,
    telefono: optionalText,
    email: optionalEmail,
    cuentaCorriente: z.boolean().optional(),
    limiteCredito: z
      .number()
      .int("El límite debe expresarse en centavos enteros.")
      .positive("El límite de crédito debe ser mayor que cero.")
      .nullable()
      .optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const listarClientesSchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  conDeuda: z.enum(["true", "false"]).optional(),
  orden: z.enum(["saldo", "nombre"]).optional(),
  activo: z.enum(["true", "false", "todos"]).optional(),
});

export const cuentaCorrienteQuerySchema = z.object({
  desde: ymdSchema.optional(),
  hasta: ymdSchema.optional(),
});

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type EditarClienteInput = z.infer<typeof editarClienteSchema>;
export type ListarClientesInput = z.infer<typeof listarClientesSchema>;
export type CuentaCorrienteQueryInput = z.infer<typeof cuentaCorrienteQuerySchema>;
