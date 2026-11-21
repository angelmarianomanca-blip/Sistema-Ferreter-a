import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { assertAdmin, type AuthUser } from "@/lib/auth";
import { ApiError, isSqliteUniqueError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/http";
import {
  crearCategoriaSchema,
  editarCategoriaSchema,
} from "@/lib/schemas/categorias";

export interface CategoriaDTO {
  id: number;
  nombre: string;
  activa: boolean;
  productosActivos: number;
}

/**
 * RF-P7: Listado de categorías sin paginar.
 * Por defecto devuelve solo categorías activas (Sección 11.4); si `incluirInactivas`
 * es true, devuelve todas (usado en la pantalla de administración de categorías).
 */
export async function listarCategorias(
  _actor: AuthUser,
  opts?: { incluirInactivas?: boolean }
): Promise<CategoriaDTO[]> {
  const rows = await db
    .select({
      id: categorias.id,
      nombre: categorias.nombre,
      activa: categorias.activa,
      productosActivos: sql<number>`(
        SELECT count(*) FROM productos p
        WHERE p.categoria_id = ${categorias.id} AND p.activo = 1
      )`,
    })
    .from(categorias)
    .where(opts?.incluirInactivas ? undefined : eq(categorias.activa, true))
    .orderBy(asc(categorias.nombre));

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    activa: r.activa,
    productosActivos: Number(r.productosActivos),
  }));
}

/**
 * RF-P7: Alta de categoría (solo administrador).
 */
export async function crearCategoria(
  actor: AuthUser,
  input: unknown
): Promise<CategoriaDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(crearCategoriaSchema, input);

  const dup = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(sql`lower(${categorias.nombre}) = lower(${data.nombre})`)
    .limit(1);

  if (dup.length > 0) {
    throw new ApiError(
      409,
      "NOMBRE_DUPLICADO",
      "Ya existe una categoría con ese nombre.",
      [{ campo: "nombre", mensaje: "Ya existe una categoría con ese nombre." }]
    );
  }

  try {
    const [inserted] = await db
      .insert(categorias)
      .values({
        nombre: data.nombre,
        activa: true,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return {
      id: inserted.id,
      nombre: inserted.nombre,
      activa: inserted.activa,
      productosActivos: 0,
    };
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      throw new ApiError(
        409,
        "NOMBRE_DUPLICADO",
        "Ya existe una categoría con ese nombre.",
        [{ campo: "nombre", mensaje: "Ya existe una categoría con ese nombre." }]
      );
    }
    throw err;
  }
}

/**
 * RF-P7: Edición y baja lógica de categoría (solo administrador).
 * Sección 11.4: devuelve 409 CATEGORIA_EN_USO si se intenta desactivar con productos activos.
 */
export async function editarCategoria(
  actor: AuthUser,
  id: number,
  input: unknown
): Promise<CategoriaDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(editarCategoriaSchema, input);

  const [current] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, id))
    .limit(1);

  if (!current) {
    throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
  }

  const [{ count: activeCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productos)
    .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)));

  const productosActivos = Number(activeCount);

  if (data.activa === false && productosActivos > 0) {
    throw new ApiError(
      409,
      "CATEGORIA_EN_USO",
      `No se puede desactivar porque tiene ${productosActivos} producto(s) activo(s).`
    );
  }

  if (data.nombre && data.nombre.toLowerCase() !== current.nombre.toLowerCase()) {
    const dup = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(sql`lower(${categorias.nombre}) = lower(${data.nombre})`)
      .limit(1);
    if (dup.length > 0) {
      throw new ApiError(
        409,
        "NOMBRE_DUPLICADO",
        "Ya existe una categoría con ese nombre.",
        [{ campo: "nombre", mensaje: "Ya existe una categoría con ese nombre." }]
      );
    }
  }

  const [updated] = await db
    .update(categorias)
    .set({
      ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
      ...(data.activa !== undefined ? { activa: data.activa } : {}),
    })
    .where(eq(categorias.id, id))
    .returning();

  return {
    id: updated.id,
    nombre: updated.nombre,
    activa: updated.activa,
    productosActivos,
  };
}
