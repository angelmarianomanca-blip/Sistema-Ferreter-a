"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, withServerAction } from "@/lib/actions";
import * as categoriasService from "@/services/categorias.service";
import * as productosService from "@/services/productos.service";
import * as stockService from "@/services/stock.service";

export async function crearCategoriaAction(
  input: unknown
): Promise<ActionResult<categoriasService.CategoriaDTO>> {
  return withServerAction(async (user) => {
    const res = await categoriasService.crearCategoria(user, input);
    revalidatePath("/productos/categorias");
    revalidatePath("/productos");
    return res;
  });
}

export async function editarCategoriaAction(
  id: number,
  input: unknown
): Promise<ActionResult<categoriasService.CategoriaDTO>> {
  return withServerAction(async (user) => {
    const res = await categoriasService.editarCategoria(user, id, input);
    revalidatePath("/productos/categorias");
    revalidatePath("/productos");
    return res;
  });
}

export async function crearProductoAction(
  input: unknown
): Promise<ActionResult<productosService.ProductoDTO>> {
  return withServerAction(async (user) => {
    const res = await productosService.crearProducto(user, input);
    revalidatePath("/productos");
    revalidatePath("/");
    return res;
  });
}

export async function editarProductoAction(
  id: number,
  input: unknown
): Promise<ActionResult<productosService.ProductoDTO>> {
  return withServerAction(async (user) => {
    const res = await productosService.editarProducto(user, id, input);
    revalidatePath("/productos");
    revalidatePath(`/productos/${id}`);
    revalidatePath("/");
    return res;
  });
}

export async function registrarMovimientoStockAction(
  productoId: number,
  input: unknown
): Promise<ActionResult<stockService.MovimientoStockDTO>> {
  return withServerAction(async (user) => {
    const res = await stockService.registrarMovimientoManual(
      user,
      productoId,
      input
    );
    revalidatePath("/productos");
    revalidatePath(`/productos/${productoId}`);
    revalidatePath("/");
    return res;
  });
}
