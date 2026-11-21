import { NextResponse } from "next/server";
import { readJsonBody, searchParamsToObject, withApiHandler } from "@/lib/http";
import * as usuariosService from "@/services/usuarios.service";

export const GET = withApiHandler(async ({ request, user }) => {
  const query = searchParamsToObject(request.nextUrl.searchParams);
  const res = await usuariosService.listarUsuarios(user, query);
  return NextResponse.json(res, { status: 200 });
});

export const POST = withApiHandler(async ({ request, user }) => {
  const body = await readJsonBody(request);
  const res = await usuariosService.crearUsuario(user, body);
  return NextResponse.json(res, { status: 201 });
});
