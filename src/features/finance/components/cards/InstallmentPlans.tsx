"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { planOngoingInstallments } from "@/features/finance/domain/installments";
import { invoiceLabel, monthShort } from "@/features/finance/domain/labels";
import { parseMoneyInput, sumCents } from "@/features/finance/domain/money";
import type { Category, MonthKey } from "@/features/finance/domain/types";
import { addOngoingInstallments } from "@/features/finance/server/actions";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";
import { Meter } from "@/components/ui/Meter";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import type { InstallmentPlan } from "./cardView";

type InstallmentPlansProps = {
  cardId: string;
  plans: InstallmentPlan[];
  categories: Category[];
  openMonth: MonthKey;
  currentYear: number;
};

/** Compras parceladas com parcelas ainda por vir (da fatura aberta em diante). */
export function InstallmentPlans({ cardId, plans, categories, openMonth, currentYear }: InstallmentPlansProps) {
  const [adding, setAdding] = useState(false);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const remainingCents = sumCents(plans.map((plan) => plan.remainingCents));

  return (
    <Panel
      title="Parcelamentos ativos"
      description={
        plans.length ? (
          <>
            <Money cents={remainingCents} /> a pagar em {plans.length} {plans.length === 1 ? "compra" : "compras"}
          </>
        ) : undefined
      }
      padded={false}
    >
      {plans.length ? (
        <ul className="divide-y divide-border">
          {plans.map((plan) => {
            const category = plan.categoryId ? categoriesById.get(plan.categoryId) : undefined;
            const isLast = plan.endMonth === openMonth;
            const notStarted = plan.nextMonth > openMonth;
            return (
              <li key={plan.groupId}>
                <Link
                  href={`/transactions?group=${plan.groupId}&month=all`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <CategoryIcon
                    icon={category?.icon}
                    color={category?.color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {plan.description}
                        </p>
                        {isLast ? <Pill tone="positive">Última</Pill> : null}
                      </div>
                      <span className="shrink-0 text-sm">
                        <Money
                          cents={plan.installmentCents}
                          className="font-semibold"
                        />
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </span>
                    </div>
                    <Meter value={((plan.nextIndex - 1) / plan.count) * 100} />
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {notStarted
                          ? `Próxima ${plan.nextIndex}/${plan.count} em ${monthShort(plan.nextMonth)}`
                          : `Parcela ${plan.nextIndex}/${plan.count}`}
                        {isLast ? null : ` · termina em ${monthShort(plan.endMonth)}`}
                      </span>
                      <span className="whitespace-nowrap">
                        falta{" "}
                        <Money
                          cents={plan.remainingCents}
                          className="font-semibold text-foreground"
                        />
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-5 text-sm text-muted-foreground">
          Nenhuma compra parcelada em aberto neste cartão.
        </p>
      )}

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setAdding(true)}
        >
          <Plus />
          Adicionar parcelamento que já existia
        </Button>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Parcelamento que já existia"
        description="Compra parcelada feita antes de você usar o app."
      >
        <OngoingInstallmentForm
          cardId={cardId}
          categories={categories}
          openMonth={openMonth}
          currentYear={currentYear}
          onDone={() => setAdding(false)}
        />
      </Modal>
    </Panel>
  );
}

type OngoingInstallmentFormProps = {
  cardId: string;
  categories: Category[];
  openMonth: MonthKey;
  currentYear: number;
  onDone: () => void;
};

function OngoingInstallmentForm({ cardId, categories, openMonth, currentYear, onDone }: OngoingInstallmentFormProps) {
  const { pending, execute } = useAction();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [current, setCurrent] = useState("");
  const [count, setCount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openLabel = invoiceLabel(openMonth, currentYear).toLowerCase();
  const installmentCents = parseMoneyInput(amount);
  const currentIndex = Number(current);
  const total = Number(count);
  const validNumbers =
    Number.isInteger(currentIndex) && Number.isInteger(total) && total >= 2 && total <= 48 && currentIndex >= 1;
  const plan =
    validNumbers && currentIndex < total && installmentCents && installmentCents > 0
      ? planOngoingInstallments(openMonth, installmentCents, currentIndex, total)
      : [];
  const first = plan[0];
  const last = plan[plan.length - 1];
  const expenseCategories = categories.filter(
    (category) => category.kind === "expense" && !category.archived && !category.systemKey,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) return setError("Descreva a compra.");
    if (!installmentCents || installmentCents <= 0) return setError("Informe o valor de cada parcela.");
    if (!validNumbers) return setError("Informe a parcela atual e o total (de 2 a 48).");
    if (currentIndex >= total) return setError("Se a parcela atual é a última, não há nada a lançar.");
    const ok = await execute(
      () =>
        addOngoingInstallments({
          cardId,
          description: description.trim(),
          categoryId: categoryId || null,
          installmentCents,
          currentIndex,
          count: total,
        }),
      { success: "Parcelamento adicionado." },
    );
    if (ok) onDone();
  }

  function change(setter: (value: string) => void) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(event.target.value);
      setError(null);
    };
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      <FormField label="Descrição">
        <Input
          autoFocus
          maxLength={120}
          placeholder="Ex.: Notebook"
          value={description}
          onChange={change(setDescription)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Valor de cada parcela">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={change(setAmount)}
          />
        </FormField>
        <FormField label="Categoria">
          <Select
            value={categoryId}
            onChange={change(setCategoryId)}
          >
            <option value="">Sem categoria</option>
            {expenseCategories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField
        label="Qual parcela está na fatura aberta?"
        hint={`A que aparece na ${openLabel} no app do banco.`}
      >
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={47}
            placeholder="4"
            aria-label="Parcela atual"
            className="w-20"
            value={current}
            onChange={change(setCurrent)}
          />
          <span className="text-sm text-muted-foreground">de</span>
          <Input
            type="number"
            inputMode="numeric"
            min={2}
            max={48}
            placeholder="10"
            aria-label="Total de parcelas"
            className="w-20"
            value={count}
            onChange={change(setCount)}
          />
        </div>
      </FormField>

      <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[0.8125rem] text-muted-foreground">
        {first && last && installmentCents ? (
          <>
            A parcela {currentIndex} já está no valor da {openLabel}. Vamos lançar as outras {plan.length}, de{" "}
            {monthShort(first.invoiceMonth)} a {monthShort(last.invoiceMonth)}:{" "}
            <Money
              cents={installmentCents * plan.length}
              className="font-semibold text-foreground"
            />{" "}
            no total.
          </>
        ) : (
          <>A parcela atual já está no valor da {openLabel}; o app lança só as que faltam, a partir da próxima fatura.</>
        )}
      </p>

      {error ? <p className="text-xs text-negative">{error}</p> : null}

      <FormActions
        onCancel={onDone}
        isLoading={pending}
        submitLabel="Adicionar"
      />
    </form>
  );
}
