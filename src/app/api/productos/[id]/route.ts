import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as productosService from "@/services/productos.service";

export const GET = withApiHandler<{ id: string }>(async ({ params, user }) => {
  const id = parseIdParam(params.id, "Producto");
  const res = await productosService.obtenerProducto(user, id);
  return NextResponse.json(res, { status: 200 });
});

export const PATCH = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Producto");
    const body = await readJsonBody(request);
    const res = await productosService.editarProducto(user, id, body);
    return NextResponse.json(res, { status: 200 });
  }
);
