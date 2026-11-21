import { z } from "zod";
import { paginationQuerySchema, ymdSchema } from "./common";

const tarjetaDatosSchema = z
  .object({
    tipo: z.enum(["debito", "credito"], {
      message: "Elegí débito o crédito.",
    }),
    marca: z
      .string({ required_error: "Ingresá la marca de la tarjeta." })
      .trim()
      .min(1, "Ingresá la marca de la tarjeta.")
      .max(40, "Máximo 40 caracteres."),
    ultimos4: z
      .string({ required_error: "Ingresá los últimos 4 dígitos." })
      .trim()
      .regex(/^\d{4}$/, "Ingresá exactamente los últimos 4 dígitos."),
  })
  .strict(); // Regla 9 y Sección 10.4: rechaza cualquier campo extra (como número completo)

const pagoContadoSchema = z
  .object({
    forma: z.literal("contado"),
    montoRecibido: z
      .number()
      .int("El monto recibido debe expresarse en centavos enteros.")
      .nonnegative("El monto recibido no puede ser negativo.")
      .optional(),
  })
  .strict();

const pagoTarjetaSchema = z
  .object({
    forma: z.literal("tarjeta"),
    tarjeta: tarjetaDatosSchema,
  })
  .strict();

const pagoCuentaCorrienteSchema = z
  .object({
    forma: z.literal("cuenta_corriente"),
  })
  .strict();

export const pagoFacturaSchema = z.discriminatedUnion("forma", [
  pagoContadoSchema,
  pagoTarjetaSchema,
  pagoCuentaCorrienteSchema,
]);

export const facturaItemInputSchema = z
  .object({
    productoId: z.coerce.number().int().positive("Producto inválido."),
    cantidad: z.coerce
      .number()
      .int("La cantidad debe ser entera.")
      .positive("La cantidad debe ser mayor que cero."),
  })
  .strict();

export const emitirFacturaSchema = z
  .object({
    clienteId: z.coerce.number().int().positive().nullable().default(null),
    items: z
      .array(facturaItemInputSchema)
      .min(1, "Agregá al menos un producto.")
      .superRefine((items, ctx) => {
        const vistos = new Set<number>();
        for (let i = 0; i < items.length; i++) {
          if (vistos.has(items[i].productoId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, "productoId"],
              message: "No se permiten productos repetidos en la misma factura.",
            });
          }
          vistos.add(items[i].productoId);
        }
      }),
    pago: pagoFacturaSchema,
  })
  .strict();

export const anularFacturaSchema = z
  .object({
    motivo: z
      .string({ required_error: "El motivo de anulación es obligatorio." })
      .trim()
      .min(3, "Ingresá un motivo de anulación.")
      .max(500, "Máximo 500 caracteres."),
  })
  .strict();

export const listarFacturasSchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  desde: ymdSchema.optional(),
  hasta: ymdSchema.optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  forma: z.enum(["contado", "tarjeta", "cuenta_corriente"]).optional(),
  estado: z.enum(["emitida", "anulada"]).optional(),
});

export type EmitirFacturaInput = z.infer<typeof emitirFacturaSchema>;
export type AnularFacturaInput = z.infer<typeof anularFacturaSchema>;
export type ListarFacturasInput = z.infer<typeof listarFacturasSchema>;
