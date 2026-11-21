"use client";

import { EstadoError } from "@/components/shared/states";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EstadoError
      titulo="Ocurrió un error al cargar la pantalla"
      mensaje={
        error.message ||
        "No pudimos completar la operación. Intentá nuevamente."
      }
      onReintentar={reset}
    />
  );
}
