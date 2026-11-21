import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as clientesService from "@/services/clientes.service";

export const GET = withApiHandler<{ id: string }>(async ({ params, user }) => {
  const id = parseIdParam(params.id, "Cliente");
  const res = await clientesService.obtenerCliente(user, id);
  return NextResponse.json(res, { status: 200 });
});

export const PATCH = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Cliente");
    const body = await readJsonBody(request);
    const res = await clientesService.editarCliente(user, id, body);
    return NextResponse.json(res, { status: 200 });
  }
);
