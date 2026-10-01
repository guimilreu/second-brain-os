import { Banknote, CreditCard, Landmark, PiggyBank, type LucideIcon } from "lucide-react";
import { institutionColor } from "@/features/finance/components/shared/InstitutionMark";
import { INSTITUTION_LABELS } from "@/features/finance/domain/labels";
import type { AccountKind, AccountPurpose, Institution } from "@/features/finance/domain/types";

export const KIND_ICONS: Record<AccountKind, LucideIcon> = {
  checking: Landmark,
  pocket: PiggyBank,
  credit_card: CreditCard,
  cash: Banknote,
};

/** Cabeçalho do grupo na lista: o rótulo "Outra" do domínio é singular. */
export const INSTITUTION_GROUP_LABELS: Record<Institution, string> = {
  mercadopago: "Mercado Pago",
  nubank: "Nubank",
  inter: "Inter",
  other: "Outras",
};

/** Cores das marcas primeiro, depois a paleta do app. */
export const ACCOUNT_COLORS = [
  institutionColor("mercadopago"),
  institutionColor("nubank"),
  institutionColor("inter"),
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

export function suggestAccountName(kind: AccountKind, institution: Institution, purpose: AccountPurpose | null): string {
  const brand = institution === "other" ? "" : INSTITUTION_LABELS[institution];
  if (kind === "checking") {
    if (institution === "mercadopago") return "Saldo em conta";
    return brand ? `Conta ${brand}` : "Conta";
  }
  if (kind === "credit_card") return brand ? `Cartão ${brand}` : "Cartão";
  if (kind === "cash") return "Dinheiro";
  if (purpose === "operating") return "Cofre Saldo";
  if (purpose === "card_reserve") return "Cofre Fatura";
  if (purpose === "savings") return "Reserva de emergência";
  return "";
}

/** No Mercado Pago o saldo em conta rende 105% do CDI e os cofrinhos, 120%. */
export function suggestYieldCdiPct(kind: AccountKind, institution: Institution): number | null {
  if (institution !== "mercadopago") return null;
  if (kind === "pocket") return 120;
  if (kind === "checking") return 105;
  return null;
}

/** "14,9" → 14.9 · vazio → null · inválido → NaN (quem chama valida). */
export function parseDecimalInput(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function formatDecimal(value: number | null): string {
  return value === null ? "" : String(value).replace(".", ",");
}

/** Dia do mês (1–31) ou null. */
export function parseDayInput(text: string): number | null {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 && value <= 31 ? value : null;
}
