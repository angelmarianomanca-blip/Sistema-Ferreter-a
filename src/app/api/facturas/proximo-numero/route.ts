import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/http";
import * as facturasService from "@/services/facturas.service";

export const GET = withApiHandler(async ({ user }) => {
  const res = await facturasService.obtenerProximoNumero(user);
  return NextResponse.json(res, { status: 200 });
});
