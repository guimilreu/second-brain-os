"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { addMonths } from "@/features/finance/domain/dates";
import {
  findExistingCardRow,
  parseNubankInvoiceCsv,
  type ParsedCardRow,
} from "@/features/finance/domain/importNubank";
import { dayMonth, invoiceLabel, monthShort } from "@/features/finance/domain/labels";
import { guessCategoryByMerchant } from "@/features/finance/domain/merchants";
import { normalizeDescription } from "@/features/finance/domain/quickEntry";
import type { EntrySuggestion } from "@/features/finance/domain/suggestions";
import type { Category, DateStr, MonthKey, Transaction } from "@/features/finance/domain/types";
import { importCardInvoice } from "@/features/finance/server/actions";
import { useAction } from "@/features/finance/components/shared/useAction";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, Select } from "@/components/ui/FormField";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";

export type InvoiceOption = {
  month: MonthKey;
  closingDate: DateStr;
  dueDate: DateStr;
  totalCents: number;
  isOpen: boolean;
};

type ImportInvoiceProps = {
  cards: { id: string; name: string }[];
  cardId: string;
  options: InvoiceOption[];
  defaultMonth: MonthKey;
  cardTransactions: Transaction[];
  categories: Category[];
  suggestions: EntrySuggestion[];
  currentYear: number;
};

type ReviewRow = ParsedCardRow & { selected: boolean; categoryId: string | null; duplicateOf: string | null };

/** Primeiro o histórico (como ele já categorizou isso); depois o palpite pelo estabelecimento. */
function guessCategory(description: string, suggestions: EntrySuggestion[], categories: Category[]) {
  const key = normalizeDescription(description);
  if (!key) return null;
  const hit =
    suggestions.find((item) => item.key === key) ??
    suggestions.find((item) => item.key.startsWith(key) || key.startsWith(item.key));
  if (hit?.categoryId && categories.some((category) => category.id === hit.categoryId)) return hit.categoryId;
  return guessCategoryByMerchant(description, categories);
}

export function ImportInvoice({
  cards,
  cardId,
  options,
  defaultMonth,
  cardTransactions,
  categories,
  suggestions,
  currentYear,
}: ImportInvoiceProps) {
  const router = useRouter();
  const { pending, execute } = useAction();
  const [month, setMonth] = useState<MonthKey>(defaultMonth);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const option = options.find((item) => item.month === month);

  function review(parsed: ParsedCardRow[], targetMonth: MonthKey) {
    return parsed.map((row) => {
      const duplicateOf = row.kind === "payment" ? null : findExistingCardRow(row, targetMonth, cardTransactions);
      return {
        ...row,
        duplicateOf,
        selected: row.kind !== "payment" && !duplicateOf,
        categoryId: row.kind === "charge" ? guessCategory(row.description, suggestions, categories) : null,
      };
    });
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseNubankInvoiceCsv(text);
    setFileName(file.name);
    setErrors(parsed.errors);
    setRows(review(parsed.rows, month));
    if (!parsed.rows.length && !parsed.errors.length) setErrors(["Nenhuma linha encontrada no arquivo."]);
  }

  function changeMonth(next: MonthKey) {
    setMonth(next);
    setRows((current) => review(current, next).map((row, index) => ({ ...row, categoryId: current[index]?.categoryId ?? row.categoryId })));
  }

  function updateRow(line: number, patch: Partial<ReviewRow>) {
    setRows((current) => current.map((row) => (row.line === line ? { ...row, ...patch } : row)));
  }

  const importable = rows.filter((row) => row.kind !== "payment");
  const selected = importable.filter((row) => row.selected);
  const selectedTotal = selected.reduce(
    (total, row) => total + (row.kind === "refund" ? -row.amountCents : row.amountCents),
    0,
  );
  const allSelected = importable.length > 0 && selected.length === importable.length;
  const generatedInstallments = selected
    .filter((row) => row.installment)
    .reduce((total, row) => total + (row.installment!.count - row.installment!.index), 0);

  async function submit() {
    const ok = await execute(
      () =>
        importCardInvoice({
          cardId,
          month,
          rows: selected.map((row) => ({
            date: row.date,
            description: row.description,
            amountCents: row.amountCents,
            kind: row.kind === "refund" ? "refund" : "charge",
            categoryId: row.categoryId,
            installment: row.installment,
          })),
        }),
      {
        onSuccess: (data) => {
          toast.success(`${data.created} lançamento(s) criados na ${invoiceLabel(month, currentYear).toLowerCase()}.`);
        },
      },
    );
    if (ok) router.push(`/cards/${cardId}?month=${month}`);
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.length > 1 ? (
            <FormField label="Cartão">
              <Select value={cardId} onChange={(event) => router.replace(`/import?card=${event.target.value}`)}>
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormField
            label="Fatura do arquivo"
            hint={option ? `Fecha ${dayMonth(option.closingDate)} · vence ${dayMonth(option.dueDate)}` : undefined}
          >
            <Select value={month} onChange={(event) => changeMonth(event.target.value)}>
              {options.map((item) => (
                <option key={item.month} value={item.month}>
                  {invoiceLabel(item.month, currentYear)}
                  {item.isOpen ? " (aberta)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void readFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
          )}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
          {fileName ? (
            <div className="flex items-center gap-3 text-left">
              <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {rows.length} linha(s) · clique para trocar o arquivo
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setFileName(null);
                  setRows([]);
                  setErrors([]);
                }}
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Remover arquivo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud className="size-7 text-muted-foreground" />
              <p className="text-sm font-semibold">Arraste o CSV da fatura ou clique para escolher</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Exporte a fatura em CSV pelo app ou site do Nubank. Pagamentos ficam de fora — eles entram em
                &quot;Pagar fatura&quot;.
              </p>
            </>
          )}
        </label>

        {errors.length ? (
          <ul className="mt-3 space-y-1 text-xs text-warning">
            {errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {rows.length ? (
        <Panel
          title="Revisar"
          description="Já lançados e pagamentos vêm desmarcados. Ajuste as categorias que eu não reconheci."
          padded={false}
          actions={
            <label className="flex items-center gap-2 text-[0.8125rem] font-medium">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) =>
                  setRows((current) =>
                    current.map((row) => (row.kind === "payment" ? row : { ...row, selected: checked === true })),
                  )
                }
              />
              Todas
            </label>
          }
        >
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const category = row.categoryId ? categoriesById.get(row.categoryId) : null;
              const signed = row.kind === "charge" ? -row.amountCents : row.amountCents;
              return (
                <li
                  key={row.line}
                  className={cn(
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap",
                    (!row.selected || row.kind === "payment") && "opacity-55",
                  )}
                >
                  <Checkbox
                    checked={row.selected}
                    disabled={row.kind === "payment"}
                    onCheckedChange={(checked) => updateRow(row.line, { selected: checked === true })}
                    aria-label={`Importar ${row.description}`}
                  />
                  <span className="num w-12 shrink-0 text-xs text-muted-foreground">{dayMonth(row.date)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">{row.description}</p>
                      {row.installment ? (
                        <Pill tone="primary" className="num">
                          {row.installment.index}/{row.installment.count}
                        </Pill>
                      ) : null}
                      {row.kind === "refund" ? <Pill tone="positive">Estorno</Pill> : null}
                      {row.kind === "payment" ? <Pill>Pagamento · fica de fora</Pill> : null}
                      {row.duplicateOf ? <Pill tone="warning">Já lançado</Pill> : null}
                    </div>
                    {row.installment && row.installment.index < row.installment.count && row.kind === "charge" ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Gera também as parcelas {row.installment.index + 1} a {row.installment.count}, até{" "}
                        {monthShort(addMonths(month, row.installment.count - row.installment.index))}
                      </p>
                    ) : null}
                  </div>
                  {row.kind === "charge" ? (
                    <div className="flex w-full items-center gap-2 pl-7 sm:w-48 sm:pl-0">
                      <CategoryIcon icon={category?.icon} color={category?.color} size="sm" />
                      <Select
                        value={row.categoryId ?? ""}
                        onChange={(event) => updateRow(row.line, { categoryId: event.target.value || null })}
                        className="h-8 text-xs"
                        aria-label="Categoria"
                      >
                        <option value="">Sem categoria</option>
                        {categories
                          .filter((item) => !item.systemKey)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                      </Select>
                    </div>
                  ) : null}
                  <Money cents={signed} signed className="ml-auto text-sm font-semibold sm:ml-0 sm:w-28 sm:text-right" />
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-16 flex flex-col gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:bottom-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.8125rem] text-muted-foreground">
              <span className="font-semibold text-foreground">{selected.length}</span> linha(s) ·{" "}
              <Money cents={-selectedTotal} signed className="font-semibold" />
              {generatedInstallments ? ` · +${generatedInstallments} parcelas futuras` : ""}
            </p>
            <Button disabled={pending || selected.length === 0} onClick={() => void submit()}>
              Importar na {invoiceLabel(month, currentYear).toLowerCase()}
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
