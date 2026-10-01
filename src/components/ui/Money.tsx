import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type MoneyProps = {
  /** Valor em centavos (o domínio inteiro trabalha em centavos). */
  cents: number;
  /** Mostra sinal (+/−) e colore: positivo verde, negativo vermelho. */
  signed?: boolean;
  /** Esconde os centavos (",00") em números grandes de resumo. */
  compact?: boolean;
  className?: string;
};

export function Money({ cents, signed = false, compact = false, className }: MoneyProps) {
  const value = (signed ? Math.abs(cents) : cents) / 100;
  const text = compact
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)
    : formatCurrency(value);
  return (
    <span
      className={cn(
        "num whitespace-nowrap",
        signed && cents > 0 && "text-positive",
        signed && cents < 0 && "text-negative",
        className,
      )}
    >
      {signed && cents !== 0 ? (cents > 0 ? "+" : "−") : null}
      {text}
    </span>
  );
}
