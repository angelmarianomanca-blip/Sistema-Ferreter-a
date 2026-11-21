import { NextResponse } from "next/server";
import { parseIdParam, searchParamsToObject, withApiHandler } from "@/lib/http";
import * as clientesService from "@/services/clientes.service";

export const GET = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Cliente");
    const query = searchParamsToObject(request.nextUrl.searchParams);
    const res = await clientesService.obtenerCuentaCorriente(user, id, query);
    return NextResponse.json(res, { status: 200 });
  }
);
