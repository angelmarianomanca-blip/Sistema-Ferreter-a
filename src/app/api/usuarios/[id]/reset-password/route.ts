import { NextResponse } from "next/server";
import { parseIdParam, withApiHandler } from "@/lib/http";
import * as usuariosService from "@/services/usuarios.service";

export const POST = withApiHandler<{ id: string }>(async ({ params, user }) => {
  const id = parseIdParam(params.id, "Usuario");
  const res = await usuariosService.resetearPassword(user, id);
  return NextResponse.json(res, { status: 200 });
});
