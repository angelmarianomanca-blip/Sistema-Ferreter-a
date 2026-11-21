import { and, asc, eq, like, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { assertAdmin, type AuthUser } from "@/lib/auth";
import { ApiError, isSqliteUniqueError } from "@/lib/errors";
import { parseOrThrow } from "@/lib/http";
import type { PaginatedResponse } from "@/lib/schemas/common";
import {
  crearProductoSchema,
  editarProductoSchema,
  listarProductosSchema,
} from "@/lib/schemas/productos";
import { moverStock } from "./stock.service";

export interface ProductoDTO {
  id: number;
  codigo: string;
  descripcion: string;
  categoria: { id: number; nombre: string };
  precio: number; // centavos
  existencia: number;
  stockMinimo: number;
  bajoMinimo: boolean;
  activo: boolean;
}

function mapProductoRow(r: {
  id: number;
  codigo: string;
  descripcion: string;
  precio: number;
  existencia: number;
  stockMinimo: number;
  activo: boolean;
  categoriaId: number;
  categoriaNombre: string;
}): ProductoDTO {
  return {
    id: r.id,
    codigo: r.codigo,
    descripcion: r.descripcion,
    categoria: {
      id: r.categoriaId,
      nombre: r.categoriaNombre,
    },
    precio: r.precio,
    existencia: r.existencia,
    stockMinimo: r.stockMinimo,
    bajoMinimo: r.existencia < r.stockMinimo,
    activo: r.activo,
  };
}

/**
 * RF-P1: Listado paginado de productos con filtros por código/descripción,
 * categoría, bajo mínimo y estado activo.
 */
export async function listarProductos(
  actor: AuthUser,
  query: unknown
): Promise<PaginatedResponse<ProductoDTO>> {
  const { q, categoriaId, bajoMinimo, activo, page, pageSize } = parseOrThrow(
    listarProductosSchema,
    query
  );

  const conditions = [];
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    conditions.push(
      or(like(productos.codigo, pattern), like(productos.descripcion, pattern))
    );
  }
  if (categoriaId !== undefined) {
    conditions.push(eq(productos.categoriaId, categoriaId));
  }
  if (bajoMinimo === "true") {
    conditions.push(lt(productos.existencia, productos.stockMinimo));
  }

  // Sección 11.4: por defecto solo activos; el admin puede pedir todos o inactivos
  if (actor.rol === "admin") {
    if (activo === "false") {
      conditions.push(eq(productos.activo, false));
    } else if (activo !== "todos") {
      conditions.push(eq(productos.activo, true));
    }
  } else {
    conditions.push(eq(productos.activo, true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        descripcion: productos.descripcion,
        precio: productos.precio,
        existencia: productos.existencia,
        stockMinimo: productos.stockMinimo,
        activo: productos.activo,
        categoriaId: categorias.id,
        categoriaNombre: categorias.nombre,
      })
      .from(productos)
      .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
      .where(where)
      .orderBy(asc(productos.codigo))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(productos)
      .where(where),
  ]);

  return {
    data: rows.map(mapProductoRow),
    page,
    pageSize,
    total: Number(count),
  };
}

/**
 * RF-P1: Obtiene la ficha de un producto por ID.
 */
export async function obtenerProducto(
  _actor: AuthUser,
  id: number
): Promise<ProductoDTO> {
  const [row] = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      categoriaId: categorias.id,
      categoriaNombre: categorias.nombre,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(eq(productos.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  return mapProductoRow(row);
}

/**
 * RF-P2 y Regla 2: Alta de producto (solo administrador).
 * La existencia inicial se registra mediante `moverStock` con motivo "Stock inicial"
 * en la misma transacción.
 */
export async function crearProducto(
  actor: AuthUser,
  input: unknown,
  opts?: { fecha?: string }
): Promise<ProductoDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(crearProductoSchema, input);

  const [cat] = await db
    .select({ id: categorias.id, nombre: categorias.nombre, activa: categorias.activa })
    .from(categorias)
    .where(eq(categorias.id, data.categoriaId))
    .limit(1);

  if (!cat || !cat.activa) {
    throw new ApiError(422, "VALIDACION", "La categoría elegida no existe o está inactiva.", [
      { campo: "categoriaId", mensaje: "Elegí una categoría activa." },
    ]);
  }

  const dup = await db
    .select({ id: productos.id })
    .from(productos)
    .where(eq(productos.codigo, data.codigo))
    .limit(1);

  if (dup.length > 0) {
    throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.", [
      { campo: "codigo", mensaje: "Ya existe un producto con ese código." },
    ]);
  }

  const fecha = opts?.fecha ?? new Date().toISOString();

  try {
    return await db.transaction(
      async (tx) => {
        const [inserted] = await tx
          .insert(productos)
          .values({
            codigo: data.codigo,
            descripcion: data.descripcion,
            categoriaId: data.categoriaId,
            precio: data.precio,
            existencia: 0,
            stockMinimo: data.stockMinimo,
            activo: true,
            createdAt: fecha,
          })
          .returning();

        let existencia = 0;
        if (data.stockInicial && data.stockInicial > 0) {
          const moved = await moverStock(tx, {
            productoId: inserted.id,
            usuarioId: actor.id,
            tipo: "ingreso",
            cantidad: data.stockInicial,
            motivo: "Stock inicial",
            fecha,
          });
          existencia = moved.existenciaResultante;
        }

        return {
          id: inserted.id,
          codigo: inserted.codigo,
          descripcion: inserted.descripcion,
          categoria: { id: cat.id, nombre: cat.nombre },
          precio: inserted.precio,
          existencia,
          stockMinimo: inserted.stockMinimo,
          bajoMinimo: existencia < inserted.stockMinimo,
          activo: inserted.activo,
        };
      },
      { behavior: "immediate" }
    );
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.", [
        { campo: "codigo", mensaje: "Ya existe un producto con ese código." },
      ]);
    }
    throw err;
  }
}

/**
 * RF-P2 y RF-P3: Edición y baja lógica de producto (solo administrador).
 * Rechaza `existencia` mediante esquema estricto (Sección 10.4 y 11.4).
 */
export async function editarProducto(
  actor: AuthUser,
  id: number,
  input: unknown
): Promise<ProductoDTO> {
  assertAdmin(actor);
  const data = parseOrThrow(editarProductoSchema, input);

  const [current] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!current) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  if (data.categoriaId !== undefined && data.categoriaId !== current.categoriaId) {
    const [cat] = await db
      .select({ id: categorias.id, activa: categorias.activa })
      .from(categorias)
      .where(eq(categorias.id, data.categoriaId))
      .limit(1);

    if (!cat || !cat.activa) {
      throw new ApiError(
        422,
        "VALIDACION",
        "La categoría elegida no existe o está inactiva.",
        [{ campo: "categoriaId", mensaje: "Elegí una categoría activa." }]
      );
    }
  }

  if (data.codigo && data.codigo !== current.codigo) {
    const dup = await db
      .select({ id: productos.id })
      .from(productos)
      .where(eq(productos.codigo, data.codigo))
      .limit(1);
    if (dup.length > 0) {
      throw new ApiError(409, "CODIGO_DUPLICADO", "Ya existe un producto con ese código.", [
        { campo: "codigo", mensaje: "Ya existe un producto con ese código." },
      ]);
    }
  }

  await db
    .update(productos)
    .set({
      ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
      ...(data.descripcion !== undefined ? { descripcion: data.descripcion } : {}),
      ...(data.categoriaId !== undefined ? { categoriaId: data.categoriaId } : {}),
      ...(data.precio !== undefined ? { precio: data.precio } : {}),
      ...(data.stockMinimo !== undefined ? { stockMinimo: data.stockMinimo } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(productos.id, id));

  return obtenerProducto(actor, id);
}

/**
 * Cantidad de productos activos bajo su stock mínimo (usado en barra lateral y tablero RF-T1).
 */
export async function contarBajoMinimo(_actor: AuthUser): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productos)
    .where(
      and(
        eq(productos.activo, true),
        lt(productos.existencia, productos.stockMinimo)
      )
    );
  return Number(count);
}
