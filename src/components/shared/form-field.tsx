"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CampoFormulario({
  id,
  label,
  opcional,
  ayuda,
  error,
  children,
  className,
}: {
  id?: string;
  label: string;
  opcional?: boolean;
  ayuda?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <span>{label}</span>
        {opcional && (
          <span className="text-xs font-normal text-muted-foreground">
            (opcional)
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive font-medium">{error}</p>
      ) : ayuda ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  );
}

/**
 * Campo reutilizable para importes monetarios en formato argentino ($).
 */
export function CampoImporte({
  id,
  value,
  onChange,
  placeholder = "0,00",
  disabled,
  invalid,
  inputRef,
  onKeyDown,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground select-none">
        $
      </span>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        onKeyDown={onKeyDown}
        className="pl-7 text-right tabular-nums"
      />
    </div>
  );
}
