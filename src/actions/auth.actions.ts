"use server";

import { revalidatePath } from "next/cache";
import { clearSessionCookie, createSessionCookie } from "@/lib/auth";
import { type ActionResult, withServerAction } from "@/lib/actions";
import { ApiError } from "@/lib/errors";
import { formatZodError } from "@/lib/http";
import { ZodError } from "zod";
import * as authService from "@/services/auth.service";

export async function loginAction(
  input: unknown
): Promise<ActionResult<{ id: number; nombre: string; email: string; rol: "admin" | "vendedor" }>> {
  try {
    const user = await authService.login(input);
    await createSessionCookie(user.id);
    return { ok: true, data: user };
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
    console.error("[LOGIN ACTION ERROR]", err);
    return {
      ok: false,
      error: { code: "ERROR_INTERNO", message: "Ocurrió un error inesperado." },
    };
  }
}

export async function logoutAction(): Promise<ActionResult<null>> {
  await clearSessionCookie();
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function cambiarPasswordAction(
  input: unknown
): Promise<ActionResult<null>> {
  return withServerAction(async (user) => {
    await authService.cambiarPassword(user, input);
    return null;
  });
}
