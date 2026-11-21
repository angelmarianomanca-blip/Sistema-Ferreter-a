"use client";

import { useState } from "react";
import type { ZodTypeAny } from "zod";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions";

export type FieldErrors = Record<string, string>;

function extractFieldErrors(details: unknown): FieldErrors {
  const map: FieldErrors = {};
  if (Array.isArray(details)) {
    for (const item of details) {
      if (
        item &&
        typeof item === "object" &&
        "campo" in item &&
        "mensaje" in item
      ) {
        const campo = String((item as { campo: unknown }).campo);
        const mensaje = String((item as { mensaje: unknown }).mensaje);
        if (!map[campo]) {
          map[campo] = mensaje;
        }
      }
    }
  }
  return map;
}

/**
 * Sección 10.6: Hook común para formularios.
 * Resuelve primero la validación con el esquema de Zod compartido, luego envía
 * al servidor (Server Action o API), mapea errores por campo y muestra avisos.
 */
export function useFormAction<TData, TInput = unknown>(options: {
  schema?: ZodTypeAny;
  action: (validated: TInput) => Promise<ActionResult<TData>>;
  successMessage?: string | ((data: TData) => string);
  onSuccess?: (data: TData) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function clearError(field?: string) {
    if (!field) {
      setFieldErrors({});
      setFormError(null);
      return;
    }
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function submit(rawInput: unknown): Promise<ActionResult<TData>> {
    setFieldErrors({});
    setFormError(null);

    let payload = rawInput as TInput;
    if (options.schema) {
      const parsed = options.schema.safeParse(rawInput);
      if (!parsed.success) {
        const errs: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".") || "_general";
          if (!errs[key]) errs[key] = issue.message;
        }
        setFieldErrors(errs);
        if (errs._general) setFormError(errs._general);
        return {
          ok: false,
          error: {
            code: "VALIDACION",
            message: "Hay campos con errores.",
          },
        };
      }
      payload = parsed.data;
    }

    setSubmitting(true);
    try {
      const res = await options.action(payload);
      if (!res.ok) {
        const srvFields = extractFieldErrors(res.error.details);
        if (Object.keys(srvFields).length > 0) {
          setFieldErrors(srvFields);
        }
        setFormError(res.error.message);
        toast.error(res.error.message);
        return res;
      }

      if (options.successMessage) {
        const msg =
          typeof options.successMessage === "function"
            ? options.successMessage(res.data)
            : options.successMessage;
        toast.success(msg);
      }
      options.onSuccess?.(res.data);
      return res;
    } catch {
      const msg = "No se pudo conectar con el servidor.";
      setFormError(msg);
      toast.error(msg);
      return {
        ok: false,
        error: { code: "ERROR_INTERNO", message: msg },
      };
    } finally {
      setSubmitting(false);
    }
  }

  return {
    submit,
    submitting,
    fieldErrors,
    formError,
    setFormError,
    clearError,
  };
}
