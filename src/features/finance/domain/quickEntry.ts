import { addDays, toDateStr } from "./dates";
import { parseMoneyInput } from "./money";
import type { Account, Cents, DateStr, Institution, PaymentMethod } from "./types";

export type QuickEntryParse = {
  description: string;
  amountCents: Cents | null;
  installments: number | null;
  institution: Institution | null;
  method: PaymentMethod | null;
  date: DateStr | null;
};

const INSTITUTION_WORDS: [RegExp, Institution][] = [
  [/\b(nubank|nu|roxinho)\b/i, "nubank"],
  [/\b(mercado\s*pago|mercadopago|mpago|mp)\b/i, "mercadopago"],
  [/\b(inter)\b/i, "inter"],
];

const METHOD_WORDS: [RegExp, PaymentMethod][] = [
  [/\b(pix)\b/i, "pix"],
  [/\b(d[eé]bito)\b/i, "debit"],
  [/\b(cr[eé]dito|cart[aã]o)\b/i, "credit"],
  [/\b(dinheiro|esp[eé]cie)\b/i, "cash"],
  [/\b(boleto)\b/i, "boleto"],
];

/**
 * Lê um lançamento escrito em linguagem natural: "ifood 42,90 nubank", "notebook 3600 12x",
 * "uber 23 pix ontem". O que não reconhece fica na descrição.
 */
export function parseQuickEntry(input: string, today: DateStr): QuickEntryParse {
  let rest = ` ${input} `;
  const take = (pattern: RegExp) => {
    const match = rest.match(pattern);
    if (match) rest = rest.replace(match[0], " ");
    return match;
  };

  const installmentsMatch = take(/\s(\d{1,2})\s*x(?=\s)/i);
  const installments = installmentsMatch ? Number(installmentsMatch[1]) : null;

  let date: DateStr | null = null;
  if (take(/\santeontem(?=\s)/i)) date = addDays(today, -2);
  else if (take(/\sontem(?=\s)/i)) date = addDays(today, -1);
  else if (take(/\shoje(?=\s)/i)) date = today;
  else {
    const dateMatch = take(/\s(\d{1,2})\/(\d{1,2})(?=\s)/);
    if (dateMatch) {
      const year = Number(today.slice(0, 4));
      const candidate = toDateStr(year, Number(dateMatch[2]), Number(dateMatch[1]));
      date = candidate > today ? toDateStr(year - 1, Number(dateMatch[2]), Number(dateMatch[1])) : candidate;
    }
  }

  let institution: Institution | null = null;
  for (const [pattern, value] of INSTITUTION_WORDS) {
    if (take(new RegExp(`\\s${pattern.source}(?=\\s)`, "i"))) {
      institution = value;
      break;
    }
  }

  let method: PaymentMethod | null = null;
  for (const [pattern, value] of METHOD_WORDS) {
    if (take(new RegExp(`\\s${pattern.source}(?=\\s)`, "i"))) {
      method = value;
      break;
    }
  }

  const amountMatch = take(/\s(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s)/i);
  const amountCents = amountMatch ? parseMoneyInput(amountMatch[1]) : null;

  return {
    description: rest.replace(/\s+/g, " ").trim(),
    amountCents,
    installments: installments && installments > 1 ? installments : null,
    institution,
    method,
    date,
  };
}

/** Escolhe a conta que corresponde à instituição/meio citados. */
export function resolveAccountForHints(
  accounts: Account[],
  hints: { institution: Institution | null; method: PaymentMethod | null; allowCard?: boolean },
): Account | null {
  const active = accounts.filter((account) => !account.archived);
  const pool = hints.institution ? active.filter((account) => account.institution === hints.institution) : active;
  const card = hints.allowCard === false ? undefined : pool.find((account) => account.kind === "credit_card");
  if (!hints.institution && !hints.method) return null;
  if (hints.method === "credit") return card ?? null;
  if (hints.method === "cash") return active.find((account) => account.kind === "cash") ?? null;
  return (
    pool.find((account) => account.purpose === "operating") ??
    // Só o banco ("ifood 42,90 nubank"): sem cofre do dia a dia, é o cartão — a conta Nubank só repassa a fatura.
    (hints.institution && !hints.method ? card : undefined) ??
    pool.find((account) => account.kind === "checking") ??
    (hints.institution ? card : undefined) ??
    null
  );
}

/** Normaliza descrição para aprender categoria/conta por histórico ("iFood *Pedido 123" ≈ "ifood pedido"). */
export function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
