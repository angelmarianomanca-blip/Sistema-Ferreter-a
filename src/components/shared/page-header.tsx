import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function EncabezadoPagina({
  titulo,
  subtitulo,
  badge,
  volverHref,
  volverTexto,
  acciones,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  badge?: ReactNode;
  volverHref?: string;
  volverTexto?: string;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between no-print",
        className
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {volverHref && volverTexto && (
          <Link
            href={volverHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit mb-0.5"
          >
            <ArrowLeft className="size-3.5" />
            <span>{volverTexto}</span>
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {titulo}
          </h1>
          {badge}
        </div>
        {subtitulo && (
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        )}
      </div>
      {acciones && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {acciones}
        </div>
      )}
    </div>
  );
}
