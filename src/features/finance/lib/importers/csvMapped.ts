import { createHash } from "node:crypto";
import { parseCsvGeneric, type CsvRow } from "@/features/finance/lib/importers/csvGeneric";
import type { ParsedOfxTransaction } from "@/features/finance/lib/importers/ofx";

function parseAmount(raw: string): number {
  const s = raw.trim().replace(/[^\d,.+-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    return Math.abs(Number(normalized));
  }
  if (s.includes(",")) {
    return Math.abs(Number(s.replace(",", ".")));
  }
  return Math.abs(Number(s));
}

function parseDateCell(s: string): Date | null {
  const t = s.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Detecta colunas comuns (Nubank, Mercado Pago exports parcialmente compatíveis, genérico PT-BR). */
export function detectCsvColumns(rows: CsvRow[]): {
  dateKey: string;
  amountKey: string;
  titleKey: string;
  signedAmount: boolean;
} | null {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]);
  const normalized = keys.map((k) => ({ raw: k, n: normalizeKey(k) }));

  const dateKey =
    keys.find((_, i) =>
      /data|date|dia|vencimento|posting|occurred/.test(normalized[i].n),
    ) ?? keys[0];

  const amountKey =
    keys.find((_, i) => {
      const n = normalized[i].n;
      return (
        n.includes("valor") ||
        n.includes("amount") ||
        n === "value" ||
        n.includes("total") ||
        n.includes("brl")
      );
    }) ?? keys[1];

  const titleKey =
    keys.find((_, i) => {
      const n = normalized[i].n;
      return (
        n.includes("descricao") ||
        n.includes("description") ||
        n.includes("memo") ||
        n.includes("titulo") ||
        n.includes("title") ||
        n.includes("estabelecimento") ||
        n.includes("detalhe")
      );
    }) ?? keys[Math.min(2, keys.length - 1)];

  const signedAmount = keys.some((_, i) => /entrada|saida|tipo|d c|credit|debit/.test(normalized[i].n));

  return { dateKey, amountKey, titleKey, signedAmount };
}

export function mapCsvRowsToTransactions(rows: CsvRow[]): ParsedOfxTransaction[] {
  const detected = detectCsvColumns(rows);
  if (!detected) return [];
  const { dateKey, amountKey, titleKey, signedAmount } = detected;
  const out: ParsedOfxTransaction[] = [];

  for (const row of rows) {
    const dateRaw = row[dateKey] ?? "";
    const amountRaw = row[amountKey] ?? "";
    const titleRaw = (row[titleKey] ?? row[Object.keys(row)[1] ?? ""] ?? "Importado CSV").trim();
    const occurredAt = parseDateCell(dateRaw);
    if (!occurredAt || !amountRaw) continue;

    let amount = parseAmount(amountRaw);
    let type: "income" | "expense" = "expense";
    if (signedAmount) {
      const t = amountRaw.trim();
      const neg = t.startsWith("-") || /^\(.*\)$/.test(t);
      amount = parseAmount(amountRaw);
      type = neg ? "expense" : "income";
    } else {
      const lower = titleRaw.toLowerCase();
      if (
        /saldo|pix receb|ted receb|rendimento|sal[aá]rio|dep[oó]sito|recebimento/.test(lower)
      ) {
        type = "income";
      }
    }

    const externalId = createHash("sha256")
      .update(`${occurredAt.toISOString()}|${amount}|${titleRaw}`)
      .digest("hex")
      .slice(0, 32);

    out.push({
      occurredAt,
      amount,
      title: titleRaw || "Importado CSV",
      type,
      externalId,
    });
  }

  return out;
}

export function parseCsvContentToTransactions(content: string): ParsedOfxTransaction[] {
  const rows = parseCsvGeneric(content);
  return mapCsvRowsToTransactions(rows);
}
