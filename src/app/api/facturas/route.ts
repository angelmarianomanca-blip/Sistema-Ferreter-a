import { NextResponse } from "next/server";
import { readJsonBody, searchParamsToObject, withApiHandler } from "@/lib/http";
import * as facturasService from "@/services/facturas.service";

export const GET = withApiHandler(async ({ request, user }) => {
  const query = searchParamsToObject(request.nextUrl.searchParams);
  const res = await facturasService.listarFacturas(user, query);
  return NextResponse.json(res, { status: 200 });
});

export const POST = withApiHandler(async ({ request, user }) => {
  const body = await readJsonBody(request);
  const res = await facturasService.emitirFactura(user, body);
  return NextResponse.json(res, { status: 201 });
});
