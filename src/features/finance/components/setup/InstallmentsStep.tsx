"use client";

import { Layers, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { MoneyInput } from "@/features/finance/components/accounts/fields";
import { planOngoingInstallments } from "@/features/finance/domain/installments";
import { monthShort } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Category, DateStr, MonthKey } from "@/features/finance/domain/types";
import { formatCents } from "@/lib/utils/format";
import { draftCardCycle, newDraftId, type DraftAccount, type DraftInstallment, type SetupDraft } from "./draft";

type InstallmentsStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
  categories: Category[];
  today: DateStr;
};

export function InstallmentsStep({ draft, setDraft, categories, today }: InstallmentsStepProps) {
  const cards = draft.accounts.filter((account) => account.card);

  function add() {
    setDraft((current) => ({
      ...current,
      installments: [
        ...current.installments,
        {
          id: newDraftId(),
          cardKey: cards[0]?.key ?? "",
          description: "",
          amountText: "",
          currentText: "",
          countText: "",
          categoryId: "",
        },
      ],
    }));
  }

  function update(id: string, patch: Partial<DraftInstallment>) {
    setDraft((current) => ({
      ...current,
      installments: current.installments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function remove(id: string) {
    setDraft((current) => ({ ...current, installments: current.installments.filter((item) => item.id !== id) }));
  }

  if (!cards.length) {
    return (
      <Panel title="Parcelamentos em andamento">
        <EmptyState icon={Layers} title="Sem cartão, sem parcelamentos" description="Pode continuar." />
      </Panel>
    );
  }

  return (
    <Panel
      title="Parcelamentos em andamento"
      description="Compras parceladas antes do app. A parcela deste mês já está na fatura aberta: aqui entram só as que faltam."
      padded={false}
    >
      {draft.installments.length ? (
        <>
          <ul className="divide-y divide-border">
            {draft.installments.map((item, index) => (
              <InstallmentRow
                key={item.id}
                item={item}
                index={index}
                cards={cards}
                categories={categories}
                today={today}
                onChange={(patch) => update(item.id, patch)}
                onRemove={() => remove(item.id)}
              />
            ))}
          </ul>
          <div className="border-t border-border p-4">
            <Button variant="outline" onClick={add}>
              <Plus />
              Adicionar outro
            </Button>
          </div>
        </>
      ) : (
        <div className="p-5">
          <EmptyState
            icon={Layers}
            title="Nenhum parcelamento"
            description="Tem compra parcelada rolando no cartão? Adicione para o app saber o que vem nas próximas faturas."
            actionLabel="Adicionar parcelamento"
            onAction={add}
          />
        </div>
      )}
    </Panel>
  );
}

/** "Faltam 6 parcelas de R$ 300,00 (R$ 1.800,00), até a fatura de abr/27." */
function preview(item: DraftInstallment, openMonth: MonthKey | null): string | null {
  const amountCents = parseMoneyInput(item.amountText);
  const current = Number(item.currentText);
  const count = Number(item.countText);
  if (!openMonth || !amountCents || amountCents <= 0 || !item.currentText || !item.countText) return null;
  if (!Number.isInteger(current) || !Number.isInteger(count) || current < 1 || count < 2 || current > count) return null;
  const plan = planOngoingInstallments(openMonth, amountCents, current, count);
  const last = plan.at(-1);
  if (!last) return "É a última parcela: já está na fatura aberta, nada a lançar.";
  const remaining = plan.length;
  return `Faltam ${remaining} ${remaining === 1 ? "parcela" : "parcelas"} de ${formatCents(amountCents)} (${formatCents(amountCents * remaining)}), até a fatura de ${monthShort(last.invoiceMonth)}.`;
}

function InstallmentRow({
  item,
  index,
  cards,
  categories,
  today,
  onChange,
  onRemove,
}: {
  item: DraftInstallment;
  index: number;
  cards: DraftAccount[];
  categories: Category[];
  today: DateStr;
  onChange: (patch: Partial<DraftInstallment>) => void;
  onRemove: () => void;
}) {
  const card = cards.find((account) => account.key === item.cardKey)?.card ?? null;
  const cycle = card ? draftCardCycle(card, today) : null;
  const text = preview(item, cycle?.openMonth ?? null);

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Parcelamento {index + 1}</p>
        <Button variant="ghost" size="icon-sm" aria-label="Remover parcelamento" onClick={onRemove}>
          <X />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField label="Compra" className="col-span-2">
          <Input
            value={item.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Ex.: Notebook"
            maxLength={120}
          />
        </FormField>
        <FormField label="Valor da parcela">
          <MoneyInput value={item.amountText} onValueChange={(amountText) => onChange({ amountText })} />
        </FormField>
        <FormField label="Parcela atual">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={item.currentText}
              onChange={(event) => onChange({ currentText: event.target.value })}
              aria-label="Parcela que está na fatura aberta"
              placeholder="4"
              className="num px-2 text-center"
            />
            <span className="text-[0.8125rem] text-muted-foreground">de</span>
            <Input
              type="number"
              inputMode="numeric"
              min={2}
              max={48}
              value={item.countText}
              onChange={(event) => onChange({ countText: event.target.value })}
              aria-label="Total de parcelas"
              placeholder="10"
              className="num px-2 text-center"
            />
          </div>
        </FormField>
        <FormField label="Categoria" className={cards.length > 1 ? undefined : "col-span-2"}>
          <Select value={item.categoryId} onChange={(event) => onChange({ categoryId: event.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        {cards.length > 1 ? (
          <FormField label="Cartão">
            <Select value={item.cardKey} onChange={(event) => onChange({ cardKey: event.target.value })}>
              {cards.map((account) => (
                <option key={account.key} value={account.key}>
                  {account.name}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {text ?? "A parcela atual é a que aparece na fatura aberta hoje."}
      </p>
    </li>
  );
}
