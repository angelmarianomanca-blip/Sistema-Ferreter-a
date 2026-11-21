import { NextResponse } from "next/server";
import { parseIdParam, withApiHandler } from "@/lib/http";
import * as pagosService from "@/services/pagos.service";

export const GET = withApiHandler<{ id: string }>(async ({ params, user }) => {
  const id = parseIdParam(params.id, "Pago");
  const res = await pagosService.obtenerPago(user, id);
  return NextResponse.json(res, { status: 200 });
});
