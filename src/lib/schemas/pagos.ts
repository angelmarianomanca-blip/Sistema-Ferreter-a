import { z } from "zod";

export const registrarPagoSchema = z
  .object({
    importe: z
      .number({ required_error: "El importe es obligatorio." })
      .int("El importe debe expresarse en centavos enteros.")
      .positive("El importe debe ser mayor que cero."),
    medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"], {
      message: "Elegí un medio de pago válido.",
    }),
    observacion: z
      .string()
      .trim()
      .max(300, "Máximo 300 caracteres.")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .strict();

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;
