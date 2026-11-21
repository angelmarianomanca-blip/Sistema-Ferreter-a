import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError } from "./errors";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(userId: number): Promise<void> {
  const { token, maxAge } = await signSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Resuelve el usuario autenticado contra la base de datos en cada pedido.
 * Sección 10.5: un usuario desactivado o con rol cambiado pierde el acceso de inmediato.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [row] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
    })
    .from(usuarios)
    .where(eq(usuarios.id, payload.uid))
    .limit(1);

  if (!row || !row.activo) return null;

  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
  };
}

/**
 * Para Route Handlers y Server Actions: exige sesión válida o lanza 401.
 */
export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new ApiError(401, "NO_AUTENTICADO", "Tu sesión venció o no iniciaste sesión.");
  }
  return user;
}

/**
 * Para Server Components (páginas): exige sesión válida o redirige a /login.
 */
export async function requirePageUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Verificación de rol administrador en la capa de servicios.
 */
export function assertAdmin(actor: AuthUser): void {
  if (actor.rol !== "admin") {
    throw new ApiError(
      403,
      "SIN_PERMISO",
      "No tenés permisos para realizar esta acción."
    );
  }
}
