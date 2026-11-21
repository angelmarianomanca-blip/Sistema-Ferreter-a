import { z } from "zod";
import { paginationQuerySchema } from "./common";

export const crearProductoSchema = z
  .object({
    codigo: z
      .string({ required_error: "El código es obligatorio." })
      .trim()
      .min(1, "El código es obligatorio.")
      .max(40, "Máximo 40 caracteres.")
      .transform((v) => v.toUpperCase()),
    descripcion: z
      .string({ required_error: "La descripción es obligatoria." })
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(200, "Máximo 200 caracteres."),
    categoriaId: z.coerce
      .number({ required_error: "Elegí una categoría." })
      .int("Elegí una categoría válida.")
      .positive("Elegí una categoría."),
    precio: z
      .number({ required_error: "El precio es obligatorio." })
      .int("El precio debe expresarse en centavos enteros.")
      .positive("El precio debe ser mayor que cero."),
    stockMinimo: z.coerce
      .number()
      .int("Debe ser un número entero.")
      .min(0, "No puede ser negativo.")
      .default(0),
    stockInicial: z.coerce
      .number()
      .int("Debe ser un número entero.")
      .min(0, "No puede ser negativo.")
      .optional(),
  })
  .strict();

/**
 * Sección 10.4 y 11.4: `.strict()` rechaza automáticamente `existencia` con 422 VALIDACION.
 */
export const editarProductoSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .min(1, "El código es obligatorio.")
      .max(40, "Máximo 40 caracteres.")
      .transform((v) => v.toUpperCase())
      .optional(),
    descripcion: z
      .string()
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(200, "Máximo 200 caracteres.")
      .optional(),
    categoriaId: z.coerce.number().int().positive("Elegí una categoría.").optional(),
    precio: z
      .number()
      .int("El precio debe expresarse en centavos enteros.")
      .positive("El precio debe ser mayor que cero.")
      .optional(),
    stockMinimo: z.coerce
      .number()
      .int("Debe ser un número entero.")
      .min(0, "No puede ser negativo.")
      .optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const listarProductosSchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  categoriaId: z.coerce.number().int().positive().optional(),
  bajoMinimo: z.enum(["true", "false"]).optional(),
  activo: z.enum(["true", "false", "todos"]).optional(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type EditarProductoInput = z.infer<typeof editarProductoSchema>;
export type ListarProductosInput = z.infer<typeof listarProductosSchema>;
