"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { diffDays, isDateStr, monthOf } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, monthName, relativeDays } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Account, Cents, DateStr, MonthKey, Recurring } from "@/features/finance/domain/types";
import { confirmOccurrence, skipOccurrence } from "@/features/finance/server/actions";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { centsToInput } from "@/lib/utils/format";

/** Uma ocorrência de fixa (o `Occurrence` do domínio já tem esse formato). */
export type OccurrenceTarget = {
  recurring: Recurring;
  month: MonthKey;
  date: DateStr;
  amountCents: Cents;
};

/** Guarda a última ocorrência enquanto o diálogo fecha, para o conteúdo não sumir na animação. */
export function useOccurrenceDialog() {
  const [state, setState] = useState<{ open: boolean; target: OccurrenceTarget | null }>({
    open: false,
    target: null,
  });
  const openFor = useCallback((target: OccurrenceTarget) => setState({ open: true, target }), []);
  const onClose = useCallback(() => setState((current) => ({ ...current, open: false })), []);
  return { openFor, dialogProps: { open: state.open, target: state.target, onClose } };
}

function whenLabel(target: OccurrenceTarget, today: DateStr) {
  const days = diffDays(today, target.date);
  const isIncome = target.recurring.type === "income";
  if (days < 0) {
    return `${isIncome ? "era para ter entrado" : "venceu"} ${relativeDays(days)} (${dayMonth(target.date)})`;
  }
  if (days === 0) return isIncome ? "entra hoje" : "vence hoje";
  return `${isIncome ? "entra" : "vence"} ${dayMonth(target.date)} (${relativeDays(days)})`;
}

type ConfirmOccurrenceDialogProps = {
  open: boolean;
  target: OccurrenceTarget | null;
  onClose: () => void;
  today: DateStr;
  accounts: Account[];
};

/** Confirma uma fixa (valor e data ajustáveis) ou registra que ela não aconteceu naquele mês. */
export function ConfirmOccurrenceDialog({ open, target, onClose, today, accounts }: ConfirmOccurrenceDialogProps) {
  if (!target) return null;
  const { recurring } = target;
  const kindLabel = recurring.type === "income" ? "Entrada" : "Saída";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={recurring.description}
      description={`${kindLabel} fixa de ${monthName(target.month)} · ${whenLabel(target, today)}`}
      size="md"
    >
      <OccurrenceForm
        key={`${recurring.id}:${target.month}`}
        target={target}
        account={accounts.find((account) => account.id === recurring.accountId) ?? null}
        today={today}
        onDone={onClose}
      />
    </Modal>
  );
}

type OccurrenceFormProps = {
  target: OccurrenceTarget;
  account: Account | null;
  today: DateStr;
  onDone: () => void;
};

function OccurrenceForm({ target, account, today, onDone }: OccurrenceFormProps) {
  const { recurring } = target;
  const isIncome = recurring.type === "income";
  // Antes do app (data < saldo inicial da conta): fica a data prevista, que não mexe no saldo já informado.
  // Depois: conta paga atrasada costuma ser paga no dia em que se confirma; entrada costuma cair no dia certo.
  const beforeApp = Boolean(account && target.date < account.openingDate);
  const defaultDate = beforeApp || isIncome ? target.date : today;
  const [date, setDate] = useState<string>(defaultDate);
  const [amount, setAmount] = useState(() => centsToInput(target.amountCents));
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  const { pending, execute } = useAction();

  const currentMonth = monthOf(today);
  const currentYear = Number(today.slice(0, 4));
  const card = !isIncome && account?.card ? account.card : null;
  const invoiceMonth = card && isDateStr(date) ? invoiceMonthFor(card, date) : null;

  const skipLabel =
    target.month === currentMonth
      ? "Não aconteceu este mês"
      : target.month < currentMonth
        ? `Não aconteceu em ${monthName(target.month)}`
        : `Pular ${monthName(target.month)}`;

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseMoneyInput(amount);
    const nextErrors = {
      amount: amountCents && amountCents > 0 ? undefined : "Informe um valor maior que zero.",
      date: isDateStr(date) ? undefined : "Escolha a data.",
    };
    setErrors(nextErrors);
    if (!amountCents || nextErrors.amount || nextErrors.date) return;

    const ok = await execute(
      () =>
        confirmOccurrence({
          recurringId: recurring.id,
          month: target.month,
          // Só vai o que mudou: sem `date`, o servidor usa a data da ocorrência (e a fatura dela).
          ...(amountCents !== target.amountCents ? { amountCents } : {}),
          ...(date !== target.date ? { date } : {}),
        }),
      { success: isIncome ? "Entrada confirmada." : "Pagamento confirmado." },
    );
    if (ok) onDone();
  }

  async function handleSkip() {
    const ok = await execute(() => skipOccurrence({ recurringId: recurring.id, month: target.month }), {
      success: `${recurring.description} ficou fora de ${monthName(target.month)}.`,
    });
    if (ok) onDone();
  }

  return (
    <form
      onSubmit={handleConfirm}
      className="grid gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Valor"
          error={errors.amount}
          hint={recurring.isEstimate ? "É uma estimativa: coloque o que veio." : undefined}
        >
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="num"
          />
        </FormField>
        <FormField
          label={isIncome ? "Recebido em" : "Pago em"}
          error={errors.date}
        >
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          {target.date !== today ? (
            <div className="flex gap-1.5">
              {[
                { value: today, label: "Hoje" },
                { value: target.date, label: `Dia previsto (${dayMonth(target.date)})` },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDate(option.value)}
                  className={
                    date === option.value
                      ? "rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground"
                      : "rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </FormField>
      </div>

      {card && invoiceMonth ? (
        <p className="text-xs text-muted-foreground">
          Cai na {invoiceLabel(invoiceMonth, currentYear).toLowerCase()}, que vence{" "}
          {dayMonth(invoiceDates(card, invoiceMonth).dueDate)}.
        </p>
      ) : null}

      <div className="-mx-6 -mb-6 mt-2 flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => void handleSkip()}
        >
          {skipLabel}
        </Button>
        <Button
          type="submit"
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isIncome ? "Confirmar recebimento" : "Confirmar pagamento"}
        </Button>
      </div>
    </form>
  );
}
