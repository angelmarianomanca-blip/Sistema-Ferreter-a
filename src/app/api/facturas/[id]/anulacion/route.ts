import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as facturasService from "@/services/facturas.service";

export const POST = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Factura");
    const body = await readJsonBody(request);
    const res = await facturasService.anularFactura(user, id, body);
    return NextResponse.json(res, { status: 200 });
  }
);
