"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type FormFieldProps = {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

const baseInputClasses =
  "w-full rounded-2xl border border-border bg-default-100/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm transition-colors hover:bg-default-100/70 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed dark:border-default-200 dark:bg-default-50/30";

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  value?: string | number;
};

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(baseInputClasses, className)}
      {...props}
    />
  );
}

type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(baseInputClasses, "resize-none leading-relaxed", className)}
      {...props}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(baseInputClasses, "cursor-pointer appearance-none", className)}
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
  "#ffc100", "#e0a800", "#22c55e", "#16a34a", "#f59e0b", "#ef4444",
  "#3b82f6", "#06b6d4", "#ec4899", "#8b5cf6", "#f97316", "#64748b",
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
            "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
            value === color ? "border-foreground scale-110" : "border-transparent",
          )}
          style={{ backgroundColor: color }}
          aria-label={color}
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

export function FormActions({
  onCancel,
  isLoading = false,
  submitLabel = "Salvar",
}: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isLoading}
        className="rounded-xl font-semibold shadow-lg shadow-primary/20"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </div>
  );
}
