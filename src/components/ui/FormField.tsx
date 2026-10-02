"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[0.8125rem] font-medium text-muted-foreground">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInputClasses =
  "w-full rounded-xl border border-input bg-foreground/[0.03] px-3.5 text-base text-foreground sm:text-sm transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 hover:border-foreground/20 focus:border-ring focus:bg-foreground/[0.05] focus:outline-none focus:ring-4 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  value?: string | number;
};

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(baseInputClasses, "h-11", className)} {...props} />;
}

type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(baseInputClasses, "min-h-20 resize-none py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

// Seta desenhada via background para manter o <select> nativo (acessível e rápido no mobile).
const selectArrow =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:16px] bg-[position:right_0.6rem_center] bg-no-repeat";

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(baseInputClasses, selectArrow, "h-11 cursor-pointer appearance-none pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
}

type ColorSwatchProps = {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
};

const DEFAULT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#64748b", "#0f172a",
];

export function ColorSwatch({ value, onChange, colors = DEFAULT_COLORS }: ColorSwatchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "size-7 rounded-full ring-offset-2 ring-offset-card transition-shadow",
            value === color ? "ring-2 ring-foreground" : "hover:ring-2 hover:ring-border",
          )}
          style={{ backgroundColor: color }}
          aria-label={color}
          aria-pressed={value === color}
        />
      ))}
    </div>
  );
}

type FormActionsProps = {
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
};

export function FormActions({ onCancel, isLoading = false, submitLabel = "Salvar" }: FormActionsProps) {
  return (
    <div className="-mx-6 -mb-6 mt-2 flex flex-col-reverse gap-2 border-t border-border bg-foreground/[0.02] px-6 py-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
