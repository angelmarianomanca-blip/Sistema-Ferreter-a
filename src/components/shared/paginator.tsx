"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Paginador({
  page,
  pageSize,
  total,
  etiqueta = "registros",
  paramName = "page",
}: {
  page: number;
  pageSize: number;
  total: number;
  etiqueta?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function goTo(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(targetPage));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/80 px-4 py-3 text-xs text-muted-foreground no-print">
      <span className="tabular-nums">
        {total === 0
          ? `0 ${etiqueta}`
          : `${from}–${to} de ${total} ${etiqueta}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Button>
          <span className="px-2 font-medium text-foreground tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goTo(page + 1)}
          >
            Siguiente
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
