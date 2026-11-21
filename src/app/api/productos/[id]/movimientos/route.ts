import { NextResponse } from "next/server";
import {
  parseIdParam,
  readJsonBody,
  searchParamsToObject,
  withApiHandler,
} from "@/lib/http";
import * as stockService from "@/services/stock.service";

export const GET = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Producto");
    const query = searchParamsToObject(request.nextUrl.searchParams);
    const res = await stockService.listarMovimientosProducto(user, id, query);
    return NextResponse.json(res, { status: 200 });
  }
);

export const POST = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Producto");
    const body = await readJsonBody(request);
    const res = await stockService.registrarMovimientoManual(user, id, body);
    return NextResponse.json(res, { status: 201 });
  }
);
