import { z } from "zod";

export const crearCategoriaSchema = z
  .object({
    nombre: z
      .string({ required_error: "El nombre es obligatorio." })
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(80, "Máximo 80 caracteres."),
  })
  .strict();

export const editarCategoriaSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(80, "Máximo 80 caracteres.")
      .optional(),
    activa: z.boolean().optional(),
  })
  .strict();

export type CrearCategoriaInput = z.infer<typeof crearCategoriaSchema>;
export type EditarCategoriaInput = z.infer<typeof editarCategoriaSchema>;
