import { NextResponse } from "next/server";
import { readJsonBody, searchParamsToObject, withApiHandler } from "@/lib/http";
import * as clientesService from "@/services/clientes.service";

export const GET = withApiHandler(async ({ request, user }) => {
  const query = searchParamsToObject(request.nextUrl.searchParams);
  const res = await clientesService.listarClientes(user, query);
  return NextResponse.json(res, { status: 200 });
});

export const POST = withApiHandler(async ({ request, user }) => {
  const body = await readJsonBody(request);
  const res = await clientesService.crearCliente(user, body);
  return NextResponse.json(res, { status: 201 });
});
