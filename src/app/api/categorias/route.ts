import { NextResponse } from "next/server";
import { readJsonBody, withApiHandler } from "@/lib/http";
import * as categoriasService from "@/services/categorias.service";

export const GET = withApiHandler(async ({ request, user }) => {
  const incluirInactivas =
    request.nextUrl.searchParams.get("incluirInactivas") === "true";
  const res = await categoriasService.listarCategorias(user, { incluirInactivas });
  return NextResponse.json({ data: res }, { status: 200 });
});

export const POST = withApiHandler(async ({ request, user }) => {
  const body = await readJsonBody(request);
  const res = await categoriasService.crearCategoria(user, body);
  return NextResponse.json(res, { status: 201 });
});
