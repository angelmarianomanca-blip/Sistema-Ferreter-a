import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sección 10.6: Primitivas de maquetación propias (Apilar, Alinear, Grilla, Texto, Titulo)
 * para que las páginas se armen sin etiquetas HTML sueltas y con estilos en Tailwind.
 */

type GapSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const GAP_CLASSES: Record<GapSize, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export function Apilar({
  children,
  gap = "md",
  className,
}: {
  children: ReactNode;
  gap?: GapSize;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", GAP_CLASSES[gap], className)}>
      {children}
    </div>
  );
}

export function Alinear({
  children,
  gap = "sm",
  justify = "start",
  align = "center",
  wrap = false,
  className,
}: {
  children: ReactNode;
  gap?: GapSize;
  justify?: "start" | "between" | "end" | "center";
  align?: "start" | "center" | "end" | "stretch";
  wrap?: boolean;
  className?: string;
}) {
  const justifyMap = {
    start: "justify-start",
    between: "justify-between",
    end: "justify-end",
    center: "justify-center",
  };
  const alignMap = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };
  return (
    <div
      className={cn(
        "flex",
        GAP_CLASSES[gap],
        justifyMap[justify],
        alignMap[align],
        wrap && "flex-wrap",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Grilla({
  children,
  cols = 2,
  gap = "md",
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: GapSize;
  className?: string;
}) {
  const colsMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  };
  return (
    <div className={cn("grid", colsMap[cols], GAP_CLASSES[gap], className)}>
      {children}
    </div>
  );
}

export function Titulo({
  children,
  nivel = 1,
  className,
}: {
  children: ReactNode;
  nivel?: 1 | 2 | 3;
  className?: string;
}) {
  if (nivel === 1) {
    return (
      <h1
        className={cn(
          "text-2xl font-bold tracking-tight text-foreground",
          className
        )}
      >
        {children}
      </h1>
    );
  }
  if (nivel === 2) {
    return (
      <h2
        className={cn(
          "text-base font-semibold tracking-tight text-foreground",
          className
        )}
      >
        {children}
      </h2>
    );
  }
  return (
    <h3 className={cn("text-sm font-semibold text-foreground", className)}>
      {children}
    </h3>
  );
}

export function Texto({
  children,
  tono = "normal",
  tamano = "sm",
  mono = false,
  className,
}: {
  children: ReactNode;
  tono?: "normal" | "muted" | "danger" | "success" | "warning" | "primary";
  tamano?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  mono?: boolean;
  className?: string;
}) {
  const tonoMap = {
    normal: "text-foreground",
    muted: "text-muted-foreground",
    danger: "text-destructive",
    success: "text-emerald-700",
    warning: "text-amber-700",
    primary: "text-primary",
  };
  const sizeMap = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  };
  return (
    <p
      className={cn(
        tonoMap[tono],
        sizeMap[tamano],
        mono && "font-mono",
        className
      )}
    >
      {children}
    </p>
  );
}
