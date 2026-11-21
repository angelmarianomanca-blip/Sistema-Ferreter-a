import { NextResponse } from "next/server";
import { searchParamsToObject, withApiHandler } from "@/lib/http";
import * as stockService from "@/services/stock.service";

export const GET = withApiHandler(async ({ request, user }) => {
  const query = searchParamsToObject(request.nextUrl.searchParams);
  const res = await stockService.listarMovimientosStock(user, query);
  return NextResponse.json(res, { status: 200 });
});
