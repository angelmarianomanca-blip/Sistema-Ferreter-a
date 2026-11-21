import { NextResponse } from "next/server";
import { parseIdParam, readJsonBody, withApiHandler } from "@/lib/http";
import * as usuariosService from "@/services/usuarios.service";

export const PATCH = withApiHandler<{ id: string }>(
  async ({ request, params, user }) => {
    const id = parseIdParam(params.id, "Usuario");
    const body = await readJsonBody(request);
    const res = await usuariosService.editarUsuario(user, id, body);
    return NextResponse.json(res, { status: 200 });
  }
);
