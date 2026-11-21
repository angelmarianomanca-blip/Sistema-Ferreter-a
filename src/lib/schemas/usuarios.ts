import { z } from "zod";
import { paginationQuerySchema } from "./common";

export const rolEnum = z.enum(["admin", "vendedor"], {
  message: "Elegí un rol válido.",
});

export const crearUsuarioSchema = z
  .object({
    nombre: z
      .string({ required_error: "El nombre es obligatorio." })
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(120, "Máximo 120 caracteres."),
    email: z
      .string({ required_error: "El email es obligatorio." })
      .trim()
      .min(1, "El email es obligatorio.")
      .email("Ingresá un email válido.")
      .transform((v) => v.toLowerCase()),
    rol: rolEnum,
    password: z
      .string({ required_error: "La contraseña temporal es obligatoria." })
      .min(8, "Al menos 8 caracteres.")
      .max(128, "Máximo 128 caracteres."),
  })
  .strict();

export const editarUsuarioSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "Ingresá al menos 2 caracteres.")
      .max(120, "Máximo 120 caracteres.")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Ingresá un email válido.")
      .transform((v) => v.toLowerCase())
      .optional(),
    rol: rolEnum.optional(),
    activo: z.boolean().optional(),
  })
  .strict();

export const listarUsuariosSchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  activo: z.enum(["true", "false", "todos"]).optional(),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
export type ListarUsuariosInput = z.infer<typeof listarUsuariosSchema>;
