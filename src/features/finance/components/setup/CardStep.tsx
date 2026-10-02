"use client";

import { CreditCard, History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { MoneyInput } from "@/features/finance/components/accounts/fields";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { dayMonth, INSTITUTION_LABELS, invoiceLabel } from "@/features/finance/domain/labels";
import type { DateStr, MonthKey } from "@/features/finance/domain/types";
import { draftCardTimeline, type DraftAccount, type DraftCard, type SetupDraft } from "./draft";

type CardStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
  today: DateStr;
};

export function CardStep({ draft, setDraft, today }: CardStepProps) {
  const cards = draft.accounts.filter((account) => account.card);
  const pockets = draft.accounts.filter((account) => account.kind === "pocket");

  function updateCard(key: string, patch: Partial<DraftCard>) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) =>
        account.key === key && account.card ? { ...account, card: { ...account.card, ...patch } } : account,
      ),
    }));
  }

  if (!cards.length) {
    return (
      <Panel title="Cartão">
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão na lista"
          description="Se você usa cartão de crédito, volte e adicione. Se não, é só continuar."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {cards.map((account) =>
        account.card ? (
          <CardForm
            key={account.key}
            account={account}
            card={account.card}
            pockets={pockets}
            today={today}
            onChange={(patch) => updateCard(account.key, patch)}
          />
        ) : null,
      )}

      <div className="tile flex gap-3 p-5 text-[0.8125rem]">
        <History className="mt-0.5 size-4 shrink-0 text-primary-ink" />
        <p>
          <span className="font-semibold">As compras entram depois, com a data real.</span>{" "}
          <span className="text-muted-foreground">
            Ao concluir, lance o que ainda vai ser cobrado — inclusive parcelados antigos — ou importe o CSV da fatura.
            Cada compra cai sozinha na fatura certa, e as parcelas nas seguintes.
          </span>
        </p>
      </div>
    </div>
  );
}

function CardForm({
  account,
  card,
  pockets,
  today,
  onChange,
}: {
  account: DraftAccount;
  card: DraftCard;
  pockets: DraftAccount[];
  today: DateStr;
  onChange: (patch: Partial<DraftCard>) => void;
}) {
  const timeline = draftCardTimeline(card, today);
  const year = Number(today.slice(0, 4));
  const bank = account.institution === "other" ? "do banco" : `do ${INSTITUTION_LABELS[account.institution]}`;
  const settled = card.settledThroughMonth;
  const settleOptions = timeline?.settleOptions ?? [];
  // Mantém a escolha visível mesmo se mudar o vencimento e ela sair da lista das últimas faturas.
  const keepsCustom = settled !== null && !settleOptions.some((option) => option.month === settled);

  return (
    <Panel
      title={
        <span className="flex items-center gap-2.5">
          <InstitutionMark institution={account.institution} name={account.name} size="sm" />
          {account.name}
        </span>
      }
      description={`Os padrões do cartão. Confira no app ${bank}.`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField label="Vence dia">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={card.dueDay}
              onChange={(event) => onChange({ dueDay: event.target.value })}
              className="num"
            />
          </FormField>
          <FormField label="Fecha" hint="Dias antes do vencimento.">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={25}
              value={card.closingDaysText}
              onChange={(event) => onChange({ closingDaysText: event.target.value })}
              className="num"
            />
          </FormField>
          <FormField label="Limite total" hint="O do cartão, não o disponível.">
            <MoneyInput value={card.limitText} onValueChange={(limitText) => onChange({ limitText })} />
          </FormField>
          <FormField label="Cofre da fatura">
            <Select
              value={card.reserveKey ?? ""}
              onChange={(event) => onChange({ reserveKey: event.target.value || null })}
            >
              <option value="">Nenhum</option>
              {pockets.map((pocket) => (
                <option key={pocket.key} value={pocket.key}>
                  {pocket.name || "Cofre sem nome"}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {timeline ? (
          <div className="rounded-2xl bg-foreground/[0.04]">
            <ul className="divide-y divide-border/70">
              {timeline.invoices.map((invoice) => {
                const isOpen = invoice.month === timeline.openMonth;
                const isSettled = !isOpen && settled !== null && invoice.month <= settled;
                return (
                  <li key={invoice.month} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.8125rem] font-semibold">{invoiceLabel(invoice.month, year)}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.closingDate <= today ? "fechou" : "fecha"} {dayMonth(invoice.closingDate)} ·{" "}
                        {invoice.dueDate < today ? "venceu" : "vence"} {dayMonth(invoice.dueDate)}
                      </p>
                    </div>
                    {isOpen ? (
                      <Pill tone="primary">Aberta · compras de hoje</Pill>
                    ) : isSettled ? (
                      <Pill tone="positive">Paga</Pill>
                    ) : (
                      <Pill tone="warning">A pagar</Pill>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
              Se uma fatura fechar em outro dia, dá para ajustar só ela depois, na tela do cartão.
            </p>
          </div>
        ) : null}

        <FormField
          label="Última fatura já paga"
          hint="Compras que caem nela ou antes contam nos gastos de cada mês, mas não como dívida nem na reserva."
        >
          <Select
            value={settled ?? ""}
            onChange={(event) => onChange({ settledThroughMonth: (event.target.value || null) as MonthKey | null })}
            className="sm:max-w-sm"
          >
            {keepsCustom ? <option value={settled}>{invoiceLabel(settled, year)}</option> : null}
            {settleOptions.map((option) => (
              <option key={option.month} value={option.month}>
                {invoiceLabel(option.month, year)} · {option.dueDate < today ? "venceu" : "vence"}{" "}
                {dayMonth(option.dueDate)}
              </option>
            ))}
            <option value="">Nenhuma — vou registrar os pagamentos</option>
          </Select>
        </FormField>
      </div>
    </Panel>
  );
}
