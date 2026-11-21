import { ZodError } from "zod";
import { type AuthUser, requireSessionUser } from "./auth";
import { ApiError, type ErrorCode } from "./errors";
import { formatZodError } from "./http";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
      };
    };

/**
 * Envoltorio común de Server Actions (Sección 10.3).
 * Exige sesión, llama al servicio y devuelve { ok, data } o { ok: false, error }.
 */
export async function withServerAction<T>(
  fn: (user: AuthUser) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const user = await requireSessionUser();
    const data = await fn(user);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      };
    }
    if (err instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "VALIDACION",
          message: "Hay campos con errores.",
          details: formatZodError(err),
        },
      };
    }
    console.error("[SERVER ACTION ERROR]", err);
    return {
      ok: false,
      error: {
        code: "ERROR_INTERNO",
        message: "Ocurrió un error inesperado. Intentá de nuevo.",
      },
    };
  }
}
