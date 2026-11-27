"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/actions/auth.actions";
import { CampoFormulario } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/hooks/use-form-action";
import { COMERCIO } from "@/lib/constants";
import { loginSchema } from "@/lib/schemas/auth";

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { submit, submitting, fieldErrors, formError, clearError } =
    useFormAction({
      schema: loginSchema,
      action: (data) => loginAction(data),
      onSuccess: () => {
        router.push("/");
        router.refresh();
      },
    });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit({ email, password });
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Panel izquierdo oscuro */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#121e26] p-12 text-white">
        {/* Círculos decorativos sutiles */}
        <div className="pointer-events-none absolute right-6 top-20 size-36 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-28 right-10 size-[340px] rounded-full border-[44px] border-white/[0.04]" />

        <div className="relative z-10">
          <p className="text-xl font-bold tracking-tight">{COMERCIO.appName}</p>
          <p className="text-sm text-slate-400 mt-0.5">{COMERCIO.nombreCorto}</p>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Facturá, controlá el stock y llevá las cuentas corrientes desde el
            mostrador.
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            Cada venta descuenta existencias en el mismo acto y deja su
            movimiento registrado.
          </p>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          {COMERCIO.domicilio}
        </p>
      </div>

      {/* Panel derecho con formulario */}
      <div className="relative flex flex-col justify-center items-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 pb-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#5ec8bd] text-[#0f2228] font-bold">
              M
            </span>
            <div>
              <p className="text-base font-bold leading-tight">
                {COMERCIO.appName}
              </p>
              <p className="text-xs text-muted-foreground">
                {COMERCIO.nombreCorto}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresá con tu email y contraseña.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <CampoFormulario
              id="login-email"
              label="Email"
              error={fieldErrors.email}
            >
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="usuario@ferreteria.test"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
              />
            </CampoFormulario>

            <CampoFormulario
              id="login-password"
              label="Contraseña"
              error={fieldErrors.password}
            >
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                aria-invalid={Boolean(fieldErrors.password)}
              />
            </CampoFormulario>

            {formError && Object.keys(fieldErrors).length === 0 && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {formError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              <LogIn className="size-4" />
              <span>{submitting ? "Ingresando..." : "Ingresar"}</span>
            </Button>
          </form>
        </div>

        {/* Cuadro de integrantes */}
        <div className="mt-8 w-full max-w-sm lg:mt-0 lg:w-auto lg:absolute lg:bottom-6 lg:right-6 rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-xs text-muted-foreground shadow-xs">
          <p className="font-semibold text-foreground mb-1">Integrantes</p>
          <ul className="space-y-0.5">
            <li>Mariano Manca</li>
            <li>Rojas Mauricio</li>
            <li>Montes Luis</li>
            <li>Carrizo Gonzalo</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
