import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { readJsonBody, withPublicApiHandler } from "@/lib/http";
import * as authService from "@/services/auth.service";

export const POST = withPublicApiHandler(async ({ request }) => {
  const body = await readJsonBody(request);
  const user = await authService.login(body);
  await createSessionCookie(user.id);
  return NextResponse.json(user, { status: 200 });
});
