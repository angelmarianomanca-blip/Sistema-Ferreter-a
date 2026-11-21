import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EstadoVacio({
  titulo,
  descripcion,
  icono,
  accion,
  className,
}: {
  titulo: string;
  descripcion?: string;
  icono?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
        {icono ?? <Inbox className="size-5" />}
      </div>
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      {descripcion && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {descripcion}
        </p>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function EstadoError({
  titulo = "No se pudo cargar la información",
  mensaje,
  onReintentar,
}: {
  titulo?: string;
  mensaje?: string;
  onReintentar?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 py-10 px-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-700 mb-3">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold text-red-900">{titulo}</p>
      {mensaje && <p className="mt-1 text-sm text-red-700 max-w-md">{mensaje}</p>}
      {onReintentar && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReintentar}
          className="mt-4"
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EstadoCargandoTabla({ filas = 6 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex flex-col gap-2 pt-2">
        {Array.from({ length: filas }).map((_, idx) => (
          <Skeleton key={idx} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

export function EstadoCargandoTarjetas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: cantidad }).map((_, idx) => (
        <Skeleton key={idx} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}
