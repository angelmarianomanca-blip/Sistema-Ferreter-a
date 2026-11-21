import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/http";
import * as authService from "@/services/auth.service";

export const GET = withApiHandler(async ({ user }) => {
  const perfil = await authService.obtenerPerfil(user);
  return NextResponse.json(perfil, { status: 200 });
});
