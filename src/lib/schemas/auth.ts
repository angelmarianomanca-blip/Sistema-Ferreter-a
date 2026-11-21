import { z } from "zod";

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: "El email es obligatorio." })
      .trim()
      .min(1, "El email es obligatorio.")
      .email("Ingresá un email válido.")
      .transform((v) => v.toLowerCase()),
    password: z
      .string({ required_error: "La contraseña es obligatoria." })
      .min(1, "La contraseña es obligatoria."),
  })
  .strict();

export const cambiarPasswordSchema = z
  .object({
    actual: z
      .string({ required_error: "Ingresá tu contraseña actual." })
      .min(1, "Ingresá tu contraseña actual."),
    nueva: z
      .string({ required_error: "Ingresá la contraseña nueva." })
      .min(8, "La contraseña nueva debe tener al menos 8 caracteres.")
      .max(128, "La contraseña es demasiado larga."),
  })
  .strict();

export const cambiarPasswordFormSchema = cambiarPasswordSchema
  .extend({
    repetir: z
      .string({ required_error: "Repetí la contraseña nueva." })
      .min(1, "Repetí la contraseña nueva."),
  })
  .refine((data) => data.nueva === data.repetir, {
    message: "Las contraseñas no coinciden.",
    path: ["repetir"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type CambiarPasswordInput = z.infer<typeof cambiarPasswordSchema>;
