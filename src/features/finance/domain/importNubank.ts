import { parseCsv } from "./csv";
import { diffDays, isDateStr, toDateStr } from "./dates";
import { normalizeDescription } from "./quickEntry";
import type { Cents, DateStr, InstallmentInfo, MonthKey, Transaction } from "./types";

export type CardRowKind = "charge" | "refund" | "payment";

export type ParsedCardRow = {
  line: number;
  date: DateStr;
  /** Descrição sem o sufixo "- Parcela 2/12". */
  description: string;
  rawTitle: string;
  amountCents: Cents;
  kind: CardRowKind;
  installment: { index: number; count: number } | null;
};

export type CardCsvParse = { rows: ParsedCardRow[]; errors: string[] };

const HEADER_ALIASES = {
  date: ["date", "data"],
  title: ["title", "titulo", "descricao", "description", "estabelecimento"],
  amount: ["amount", "valor"],
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function parseDateCell(value: string): DateStr | null {
  const trimmed = value.trim();
  if (isDateStr(trimmed)) return trimmed;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (br) return toDateStr(Number(br[3]), Number(br[2]), Number(br[1]));
  return null;
}

function parseAmountCell(value: string): number | null {
  let cleaned = value.trim().replace(/[R$\s]/g, "");
  if (!cleaned) return null;
  const negative = cleaned.startsWith("-") || /^\(.*\)$/.test(cleaned);
  cleaned = cleaned.replace(/[-()]/g, "");
  if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

const INSTALLMENT_SUFFIX = /\s*[-–]?\s*parcela\s+(\d{1,2})\s*\/\s*(\d{1,2})\s*$/i;

/**
 * Lê o CSV de fatura exportado pelo app do Nubank (`date,title,amount`; aceita também
 * `date,category,title,amount` e cabeçalhos em português). Compras são positivas;
 * pagamentos e estornos vêm negativos.
 */
export function parseNubankInvoiceCsv(text: string): CardCsvParse {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ["O arquivo está vazio."] };

  const header = table[0].map(normalizeHeader);
  const indexOf = (aliases: string[]) => header.findIndex((cell) => aliases.includes(cell));
  const dateIndex = indexOf(HEADER_ALIASES.date);
  const titleIndex = indexOf(HEADER_ALIASES.title);
  const amountIndex = indexOf(HEADER_ALIASES.amount);
  if (dateIndex < 0 || titleIndex < 0 || amountIndex < 0) {
    return { rows: [], errors: ["Não reconheci as colunas. O arquivo precisa ter data, descrição e valor."] };
  }

  const rows: ParsedCardRow[] = [];
  table.slice(1).forEach((cells, offset) => {
    const line = offset + 2;
    const date = parseDateCell(cells[dateIndex] ?? "");
    const amount = parseAmountCell(cells[amountIndex] ?? "");
    const rawTitle = (cells[titleIndex] ?? "").trim();
    if (!date || amount === null || !rawTitle) {
      errors.push(`Linha ${line} ignorada (data, valor ou descrição inválidos).`);
      return;
    }
    if (amount === 0) return;
    const match = INSTALLMENT_SUFFIX.exec(rawTitle);
    const installment =
      match && Number(match[2]) > 1 ? { index: Number(match[1]), count: Number(match[2]) } : null;
    const description = (match ? rawTitle.slice(0, match.index) : rawTitle).trim() || rawTitle;
    const kind: CardRowKind =
      amount > 0 ? "charge" : /pagamento/i.test(rawTitle) ? "payment" : "refund";
    rows.push({
      line,
      date,
      description,
      rawTitle,
      amountCents: Math.round(Math.abs(amount) * 100),
      kind,
      installment,
    });
  });
  return { rows, errors };
}

export type RowMatch = { duplicateOf: string | null };

/**
 * Já está lançado? Compra/estorno: mesmo valor e descrição parecida, até 3 dias de diferença,
 * na mesma fatura. Parcela: grupo com mesma descrição, mesmo nº de parcelas e a mesma parcela na fatura.
 */
export function findExistingCardRow(
  row: ParsedCardRow,
  invoiceMonth: MonthKey,
  cardTransactions: Transaction[],
): string | null {
  const key = normalizeDescription(row.description);
  const sameText = (tx: Transaction) => {
    const other = normalizeDescription(tx.description);
    return other === key || other.includes(key) || key.includes(other);
  };
  if (row.installment) {
    const hit = cardTransactions.find(
      (tx) =>
        tx.installment?.count === row.installment?.count &&
        tx.installment?.index === row.installment?.index &&
        tx.amountCents === row.amountCents &&
        sameText(tx),
    );
    return hit?.id ?? null;
  }
  const type = row.kind === "refund" ? "refund" : "expense";
  const hit = cardTransactions.find(
    (tx) =>
      tx.type === type &&
      !tx.installment &&
      tx.invoiceMonth === invoiceMonth &&
      tx.amountCents === row.amountCents &&
      Math.abs(diffDays(tx.date, row.date)) <= 3 &&
      sameText(tx),
  );
  return hit?.id ?? null;
}

/** Parcelas que um "Parcela k/n" desta fatura gera: k nesta fatura, k+1.. nas seguintes. */
export function installmentsFromRow(row: ParsedCardRow): InstallmentInfo[] {
  if (!row.installment) return [];
  const { index, count } = row.installment;
  return Array.from({ length: count - index + 1 }, (_, offset) => ({
    groupId: "",
    index: index + offset,
    count,
  }));
}
