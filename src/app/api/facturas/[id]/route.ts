import { NextResponse } from "next/server";
import { parseIdParam, withApiHandler } from "@/lib/http";
import * as facturasService from "@/services/facturas.service";

export const GET = withApiHandler<{ id: string }>(async ({ params, user }) => {
  const id = parseIdParam(params.id, "Factura");
  const res = await facturasService.obtenerFactura(user, id);
  return NextResponse.json(res, { status: 200 });
});
