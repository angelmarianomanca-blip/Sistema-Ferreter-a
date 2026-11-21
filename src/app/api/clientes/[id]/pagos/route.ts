import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as pagosService from "@/services/pagos.service";

export const POST = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Cliente");
    const body = await readJsonBody(request);
    const res = await pagosService.registrarPago(user, id, body);
    return NextResponse.json(res, { status: 201 });
  }
);
