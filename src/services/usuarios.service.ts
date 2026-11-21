import crypto from "crypto";
import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { usuarios, type UsuarioRow } from "@/db/schema";
import { assertAdmin, type AuthUser, hashPassword } from "@/lib/auth";
import { ApiError, isSqliteUniqueError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/http";
import type { PaginatedResponse } from "@/lib/schemas/common";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  listarUsuariosSchema,
} from "@/lib/schemas/usuarios";

export interface UsuarioDTO {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
  activo: boolean;
  createdAt: string;
}

function toDTO(row: UsuarioRow): UsuarioDTO {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    rol: row.rol,
    activo: row.activo,
    createdAt: row.createdAt,
  };
}

/**
 * RF-U4: Listado paginado de usuarios (solo administrador, sin hash de contraseña).
 */
export async function listarUsuarios(
  actor: AuthUser,
  query: unknown
): Promise<PaginatedResponse<UsuarioDTO>> {
  assertAdmin(actor);
  const { q, activo, page, pageSize } = parseOrThrow(listarUsuariosSchema, query);

  const conditions = [];
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    conditions.push(or(like(usuarios.nombre, pattern), like(usuarios.email, pattern)));
  }
  if (activo === "true") {
    conditions.push(eq(usuarios.activo, true));
  } else if (activo === "false") {
    conditions.push(eq(usuarios.activo, false));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(usuarios)
      .where(where)
      .orderBy(asc(usuarios.nombre))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(usuarios)
      .where(where),
  ]);

  return {
    data: rows.map(toDTO),
    page,
    pageSize,
    total: Number(count),
  };
}

/**
 * Lista resumida de usuarios para el filtro de vendedor en el listado de facturas (RF-V8).
 */
export async function listarVendedoresParaFiltro(
  _actor: AuthUser
): Promise<Array<{ id: number; nombre: string }>> {
  return db
    .select({ id: usuarios.id, nombre: usuarios.nombre })
    .from(usuarios)
    .orderBy(asc(usuarios.nombre));
}

/**
 * RF-U4: Alta de usuario con rol y contraseña temporal (solo administrador).
 */
export async function crearUsuario(
  actor: AuthUser,
  input: unknown,
  opts?: { createdAt?: string }
): Promise<UsuarioDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(crearUsuarioSchema, input);

  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.", [
      { campo: "email", mensaje: "Ya existe un usuario con ese email." },
    ]);
  }

  const passwordHash = await hashPassword(data.password);
  const now = opts?.createdAt ?? new Date().toISOString();

  try {
    const [inserted] = await db
      .insert(usuarios)
      .values({
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        passwordHash,
        activo: true,
        createdAt: now,
      })
      .returning();

    return toDTO(inserted);
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.", [
        { campo: "email", mensaje: "Ya existe un usuario con ese email." },
      ]);
    }
    throw err;
  }
}

/**
 * RF-U4 y Regla 12: Edición y baja lógica de usuario (solo administrador).
 * Impide que un admin se desactive o se quite el rol a sí mismo (422 OPERACION_SOBRE_SI_MISMO).
 */
export async function editarUsuario(
  actor: AuthUser,
  id: number,
  input: unknown
): Promise<UsuarioDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(editarUsuarioSchema, input);

  const [current] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!current) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  if (id === actor.id) {
    if (data.activo === false) {
      throw new ApiError(
        422,
        "OPERACION_SOBRE_SI_MISMO",
        "No podés desactivar tu propio usuario."
      );
    }
    if (data.rol !== undefined && data.rol !== "admin") {
      throw new ApiError(
        422,
        "OPERACION_SOBRE_SI_MISMO",
        "No podés quitarte el rol de administrador."
      );
    }
  }

  if (data.email && data.email !== current.email) {
    const dup = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, data.email))
      .limit(1);
    if (dup.length > 0) {
      throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese email.", [
        { campo: "email", mensaje: "Ya existe un usuario con ese email." },
      ]);
    }
  }

  const [updated] = await db
    .update(usuarios)
    .set({
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.rol !== undefined ? { rol: data.rol } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(usuarios.id, id))
    .returning();

  return toDTO(updated);
}

/**
 * RF-U5: El administrador restablece la contraseña de un usuario generando
 * una contraseña temporal que se devuelve una sola vez.
 */
export async function resetearPassword(
  actor: AuthUser,
  id: number
): Promise<{ passwordTemporal: string }> {
  assertAdmin(actor);

  const [current] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!current) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let passwordTemporal = "";
  for (let i = 0; i < 10; i++) {
    passwordTemporal += alphabet[bytes[i] % alphabet.length];
  }

  const passwordHash = await hashPassword(passwordTemporal);
  await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, id));

  return { passwordTemporal };
}
