import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { type AuthUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/http";
import { cambiarPasswordSchema, loginSchema } from "@/lib/schemas/auth";

/**
 * RF-U1: Inicio de sesión con email y contraseña.
 * Sección 11.3: devuelve 401 CREDENCIALES_INVALIDAS con el mismo mensaje
 * si el email no existe, la contraseña no coincide o el usuario está inactivo.
 */
export async function login(input: unknown): Promise<AuthUser> {
  const data = parseOrThrow(loginSchema, input);

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (!user || !user.activo) {
    throw new ApiError(
      401,
      "CREDENCIALES_INVALIDAS",
      "Email o contraseña incorrectos."
    );
  }

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new ApiError(
      401,
      "CREDENCIALES_INVALIDAS",
      "Email o contraseña incorrectos."
    );
  }

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
}

/**
 * RF-U5: Cada usuario puede cambiar su propia contraseña validando la actual.
 */
export async function cambiarPassword(
  actor: AuthUser,
  input: unknown
): Promise<void> {
  const data = parseOrThrow(cambiarPasswordSchema, input);

  const [user] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, actor.id))
    .limit(1);

  if (!user || !user.activo) {
    throw new ApiError(401, "NO_AUTENTICADO", "Sesión inválida.");
  }

  const ok = await verifyPassword(data.actual, user.passwordHash);
  if (!ok) {
    throw new ApiError(
      422,
      "CONTRASENA_ACTUAL_INCORRECTA",
      "La contraseña actual no es correcta.",
      [{ campo: "actual", mensaje: "La contraseña actual no es correcta." }]
    );
  }

  const newHash = await hashPassword(data.nueva);
  await db
    .update(usuarios)
    .set({ passwordHash: newHash })
    .where(eq(usuarios.id, actor.id));
}

/**
 * RF-U2: Devuelve los datos públicos del usuario autenticado.
 */
export async function obtenerPerfil(actor: AuthUser): Promise<AuthUser> {
  return {
    id: actor.id,
    nombre: actor.nombre,
    email: actor.email,
    rol: actor.rol,
  };
}
