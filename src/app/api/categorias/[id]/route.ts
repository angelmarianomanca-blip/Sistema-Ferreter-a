import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as categoriasService from "@/services/categorias.service";

export const PATCH = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Categoría");
    const body = await readJsonBody(request);
    const res = await categoriasService.editarCategoria(user, id, body);
    return NextResponse.json(res, { status: 200 });
  }
);
