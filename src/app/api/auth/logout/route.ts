import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { withApiHandler } from "@/lib/http";

export const POST = withApiHandler(async () => {
  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
});
