"use client";

import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { MoneyInput } from "@/features/finance/components/accounts/fields";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { dayMonth, INSTITUTION_LABELS, invoiceLabel } from "@/features/finance/domain/labels";
import type { DateStr } from "@/features/finance/domain/types";
import { draftCardCycle, type DraftAccount, type DraftCard, type SetupDraft } from "./draft";

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
  const cycle = draftCardCycle(card, today);
  const year = Number(today.slice(0, 4));
  const bank = account.institution === "other" ? "do banco" : `do ${INSTITUTION_LABELS[account.institution]}`;
  const closedOverdue = cycle ? today > cycle.closed.dueDate : false;

  return (
    <Panel
      title={
        <span className="flex items-center gap-2.5">
          <InstitutionMark institution={account.institution} name={account.name} size="sm" />
          {account.name}
        </span>
      }
      description={`Confira as datas no app ${bank}.`}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField label="Fecha dia">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={card.closingDay}
              onChange={(event) => onChange({ closingDay: event.target.value })}
              className="num"
            />
          </FormField>
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
          <FormField label="Limite" hint="Opcional.">
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

        {cycle ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[0.8125rem]">
            Compras de hoje caem na{" "}
            <strong className="font-semibold">{invoiceLabel(cycle.openMonth, year).toLowerCase()}</strong>: fecha{" "}
            {dayMonth(cycle.open.closingDate)} e vence {dayMonth(cycle.open.dueDate)}.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={cycle ? `${invoiceLabel(cycle.closedMonth, year)}, ainda não paga` : "Fatura fechada, ainda não paga"}
            hint={
              cycle
                ? closedOverdue
                  ? `Venceu ${dayMonth(cycle.closed.dueDate)}. Só preencha se ainda não pagou.`
                  : `Vence ${dayMonth(cycle.closed.dueDate)}. Quanto falta pagar; se já pagou, deixe vazio.`
                : "Quanto falta pagar; se já pagou, deixe vazio."
            }
          >
            <MoneyInput
              value={card.closedUnpaidText}
              onValueChange={(closedUnpaidText) => onChange({ closedUnpaidText })}
            />
          </FormField>
          <FormField
            label={cycle ? `${invoiceLabel(cycle.openMonth, year)}, aberta hoje` : "Fatura aberta hoje"}
            hint="O valor que o app mostra agora, já com as parcelas deste mês."
          >
            <MoneyInput value={card.openText} onValueChange={(openText) => onChange({ openText })} />
          </FormField>
        </div>
      </div>
    </Panel>
  );
}
