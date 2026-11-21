import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { type AuthUser, requireSessionUser } from "./auth";
import { ApiError } from "./errors";

export interface FieldErrorDetail {
  campo: string;
  mensaje: string;
}

export function formatZodError(err: ZodError): FieldErrorDetail[] {
  return err.issues.map((issue) => {
    let campo = issue.path.join(".");
    let mensaje = issue.message;
    if (issue.code === "unrecognized_keys") {
      const keys = issue.keys.join(", ");
      campo = issue.keys[0] ?? campo;
      mensaje = `Campo no permitido: ${keys}.`;
    }
    return {
      campo: campo || "_general",
      mensaje,
    };
  });
}

export function parseOrThrow<T>(
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  input: unknown
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDACION",
      "Hay campos con errores.",
      formatZodError(result.error)
    );
  }
  return result.data;
}

export function parseIdParam(raw: string, label = "ID"): number {
  if (!/^\d+$/.test(raw)) {
    throw new ApiError(404, "NO_ENCONTRADO", `${label} no encontrado.`);
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ApiError(404, "NO_ENCONTRADO", `${label} no encontrado.`);
  }
  return n;
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "JSON_INVALIDO", "El cuerpo no es un JSON válido.");
  }
}

export function searchParamsToObject(
  searchParams: URLSearchParams
): Record<string, string> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export function errorToResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(err.toJSON(), { status: err.status });
  }
  if (err instanceof ZodError) {
    const apiErr = new ApiError(
      422,
      "VALIDACION",
      "Hay campos con errores.",
      formatZodError(err)
    );
    return NextResponse.json(apiErr.toJSON(), { status: 422 });
  }
  console.error("[API ERROR]", err);
  const internal = new ApiError(
    500,
    "ERROR_INTERNO",
    "Ocurrió un error inesperado en el servidor."
  );
  return NextResponse.json(internal.toJSON(), { status: 500 });
}

type RouteContext<P = Record<string, string>> = {
  params: Promise<P>;
};

export function withApiHandler<P = Record<string, string>>(
  handler: (ctx: {
    request: NextRequest;
    params: P;
    user: AuthUser;
  }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: RouteContext<P>
  ): Promise<NextResponse> => {
    try {
      const user = await requireSessionUser();
      const params = await context.params;
      return await handler({ request, params, user });
    } catch (err) {
      return errorToResponse(err);
    }
  };
}

export function withPublicApiHandler<P = Record<string, string>>(
  handler: (ctx: { request: NextRequest; params: P }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context: RouteContext<P>
  ): Promise<NextResponse> => {
    try {
      const params = await context.params;
      return await handler({ request, params });
    } catch (err) {
      return errorToResponse(err);
    }
  };
}
