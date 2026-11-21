"use client";

import { useState } from "react";
import { cambiarPasswordAction } from "@/actions/auth.actions";
import { CampoFormulario } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import { cambiarPasswordFormSchema } from "@/lib/schemas/auth";

export function CambiarPasswordForm() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");

  const { submit, submitting, fieldErrors, clearError } = useFormAction({
    schema: cambiarPasswordFormSchema,
    action: (data: { actual: string; nueva: string }) =>
      cambiarPasswordAction({ actual: data.actual, nueva: data.nueva }),
    successMessage: "Contraseña actualizada correctamente.",
    onSuccess: () => {
      setActual("");
      setNueva("");
      setRepetir("");
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({ actual, nueva, repetir });
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <CampoFormulario
            id="pwd-actual"
            label="Contraseña actual"
            error={fieldErrors.actual}
          >
            <Input
              id="pwd-actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => {
                setActual(e.target.value);
                clearError("actual");
              }}
              aria-invalid={Boolean(fieldErrors.actual)}
            />
          </CampoFormulario>

          <CampoFormulario
            id="pwd-nueva"
            label="Contraseña nueva"
            ayuda="Al menos 8 caracteres."
            error={fieldErrors.nueva}
          >
            <Input
              id="pwd-nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => {
                setNueva(e.target.value);
                clearError("nueva");
              }}
              aria-invalid={Boolean(fieldErrors.nueva)}
            />
          </CampoFormulario>

          <CampoFormulario
            id="pwd-repetir"
            label="Repetir contraseña nueva"
            error={fieldErrors.repetir}
          >
            <Input
              id="pwd-repetir"
              type="password"
              autoComplete="new-password"
              value={repetir}
              onChange={(e) => {
                setRepetir(e.target.value);
                clearError("repetir");
              }}
              aria-invalid={Boolean(fieldErrors.repetir)}
            />
          </CampoFormulario>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
