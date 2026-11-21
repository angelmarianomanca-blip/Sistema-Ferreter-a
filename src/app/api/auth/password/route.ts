import { NextResponse } from "next/server";
import { readJsonBody, withApiHandler } from "@/lib/http";
import * as authService from "@/services/auth.service";

export const PUT = withApiHandler(async ({ request, user }) => {
  const body = await readJsonBody(request);
  await authService.cambiarPassword(user, body);
  return new NextResponse(null, { status: 204 });
});
