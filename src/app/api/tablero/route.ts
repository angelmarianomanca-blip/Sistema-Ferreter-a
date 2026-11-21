import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/http";
import * as tableroService from "@/services/tablero.service";

export const GET = withApiHandler(async ({ user }) => {
  const res = await tableroService.obtenerTablero(user);
  return NextResponse.json(res, { status: 200 });
});
