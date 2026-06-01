import { formatCurrency } from "@/lib/utils/format";

export function formatFinanceAlertMessage(
  kind: string,
  payload: Record<string, unknown>,
): string {
  switch (kind) {
    case "low-balance":
      return `Saldo abaixo do mínimo em ${String(payload.name ?? "conta")}.`;
    case "invoice-due":
      return `Fatura vence em breve — ${formatCurrency(Number(payload.remaining ?? 0))} em aberto.`;
    case "budget-exceeded":
      return `Orçamento de ${String(payload.category)} perto do limite.`;
    case "goal-milestone":
      return `Cofrinho "${String(payload.name)}" quase atingiu a meta.`;
    case "recurring-late":
      return `Recorrência atrasada: ${String(payload.title)}.`;
    case "unusual-spending":
      return `Gasto incomum em ${String(payload.category)}.`;
    case "wishlist-over-free":
      return `Lista de compras excede o livre para gastar (${formatCurrency(Number(payload.overBy ?? 0))} acima).`;
    case "goal-funding-gap":
      return `Meta "${String(payload.name)}" precisa de ${formatCurrency(Number(payload.monthlyNeed ?? 0))}/mês.`;
    default:
      return `Alerta: ${kind}`;
  }
}
