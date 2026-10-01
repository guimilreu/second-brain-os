"use client";

import { useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { Segmented } from "@/components/ui/Segmented";
import { useAction } from "@/features/finance/components/shared/useAction";
import { addMonths, monthOf } from "@/features/finance/domain/dates";
import { monthName } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Cents, DateStr, MonthKey } from "@/features/finance/domain/types";
import { recordYields } from "@/features/finance/server/actions";
import { formatCents } from "@/lib/utils/format";
import { AccountIcon, MoneyInput } from "./fields";
import type { AccountItem } from "./overview";

type YieldsDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Contas e cofres que rendem. */
  items: AccountItem[];
  today: DateStr;
  initialMonth: MonthKey | null;
  recorded: Record<MonthKey, Record<string, Cents>>;
};

/** O app do banco mostra quanto cada cofre rendeu no mês: copie aqui e o histórico fica exato. */
export function YieldsDialog({ open, onClose, items, today, initialMonth, recorded }: YieldsDialogProps) {
  const current = monthOf(today);
  const previous = addMonths(current, -1);
  const [month, setMonth] = useState<MonthKey>(initialMonth === current ? current : (initialMonth ?? previous));
  const [values, setValues] = useState<Record<string, string>>({});
  const { pending, execute } = useAction();

  const rows = items.map((item) => {
    const text = values[item.account.id] ?? "";
    const cents = text.trim() ? parseMoneyInput(text) : 0;
    return { item, text, cents, already: recorded[month]?.[item.account.id] ?? 0 };
  });
  const total = rows.reduce((sum, row) => sum + (row.cents && row.cents > 0 ? row.cents : 0), 0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = rows.find((row) => row.cents === null || (row.cents ?? 0) < 0);
    if (invalid) {
      toast.error(`Valor inválido em ${invalid.item.account.name}.`);
      return;
    }
    const payload = rows
      .filter((row) => (row.cents ?? 0) > 0)
      .map((row) => ({ accountId: row.item.account.id, amountCents: row.cents as Cents }));
    if (!payload.length) {
      toast.error("Informe quanto rendeu em pelo menos um cofre.");
      return;
    }
    void execute(() => recordYields({ month, items: payload }), {
      success: `${formatCents(total)} de rendimento em ${monthName(month)} registrados.`,
      onSuccess: onClose,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar rendimentos"
      description="Copie do app do banco quanto cada cofre rendeu. Deixe em branco o que não rendeu."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Segmented
          options={[
            { value: previous, label: monthName(previous) },
            { value: current, label: `${monthName(current)} (até hoje)` },
          ]}
          value={month}
          onChange={setMonth}
        />
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map(({ item, text, already }) => (
            <li key={item.account.id} className="flex items-center gap-3 px-3 py-2.5">
              <AccountIcon kind={item.account.kind} color={item.account.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.account.yieldCdiPct}% do CDI
                  {item.monthlyYieldCents > 0 ? ` · estimativa ${formatCents(item.monthlyYieldCents)}` : ""}
                  {already > 0 ? ` · já lançado ${formatCents(already)}` : ""}
                </p>
              </div>
              <MoneyInput
                value={text}
                onValueChange={(value) => setValues((currentValues) => ({ ...currentValues, [item.account.id]: value }))}
                placeholder="0,00"
                className="w-32"
                aria-label={`Rendimento de ${item.account.name}`}
              />
            </li>
          ))}
        </ul>
        <div className="-mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-6 py-4">
          <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <TrendingUp className="size-4 text-positive" />
            Total <Money cents={total} className="font-semibold text-positive" />
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Registrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
