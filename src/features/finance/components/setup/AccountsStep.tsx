"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import {
  AccountIcon,
  InstitutionChoice,
  KindChoice,
  MoneyInput,
  PercentInput,
  PurposeChoice,
} from "@/features/finance/components/accounts/fields";
import { INSTITUTION_GROUP_LABELS, suggestAccountName } from "@/features/finance/components/accounts/presets";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { KIND_LABELS, PURPOSE_LABELS } from "@/features/finance/domain/labels";
import { goalMonthlySuggestion } from "@/features/finance/components/accounts/overview";
import { parseMoneyInput } from "@/features/finance/domain/money";
import {
  INSTITUTIONS,
  type AccountKind,
  type AccountPurpose,
  type DateStr,
  type Institution,
} from "@/features/finance/domain/types";
import { centsToInput, formatCents } from "@/lib/utils/format";
import {
  newDraftAccount,
  newDraftCard,
  newDraftId,
  removeDraftAccount,
  type DraftAccount,
  type SetupDraft,
} from "./draft";

type AccountsStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
  today: DateStr;
};

export function AccountsStep({ draft, setDraft, today }: AccountsStepProps) {
  const [adding, setAdding] = useState({ open: false, key: 0 });

  function update(key: string, patch: Partial<DraftAccount>) {
    setDraft((current) => ({
      ...current,
      accounts: current.accounts.map((account) => (account.key === key ? { ...account, ...patch } : account)),
    }));
  }

  return (
    <Panel
      title="Contas e cofres"
      description="Seu cenário já está montado. Ajuste os nomes e coloque o saldo que cada app mostra agora."
      padded={false}
    >
      {INSTITUTIONS.map((institution) => {
        const accounts = draft.accounts.filter((account) => account.institution === institution);
        if (!accounts.length) return null;
        return (
          <section key={institution} className="border-b border-border">
            <h3 className="flex items-center gap-2.5 px-5 pt-4 pb-1 text-sm font-bold tracking-tight">
              <InstitutionMark institution={institution} name={INSTITUTION_GROUP_LABELS[institution]} size="sm" />
              {INSTITUTION_GROUP_LABELS[institution]}
            </h3>
            <ul className="divide-y divide-border">
              {accounts.map((account) => (
                <AccountDraftRow
                  key={account.key}
                  account={account}
                  today={today}
                  onChange={(patch) => update(account.key, patch)}
                  onRemove={() => setDraft((current) => removeDraftAccount(current, account.key))}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <div className="p-4">
        <Button variant="outline" onClick={() => setAdding((current) => ({ open: true, key: current.key + 1 }))}>
          <Plus />
          Adicionar conta ou cofre
        </Button>
      </div>

      <AddAccountDialog
        key={adding.key}
        open={adding.open}
        onClose={() => setAdding((current) => ({ ...current, open: false }))}
        onAdd={(account) => setDraft((current) => ({ ...current, accounts: [...current.accounts, account] }))}
        accounts={draft.accounts}
        today={today}
      />
    </Panel>
  );
}

function AccountDraftRow({
  account,
  today,
  onChange,
  onRemove,
}: {
  account: DraftAccount;
  today: DateStr;
  onChange: (patch: Partial<DraftAccount>) => void;
  onRemove: () => void;
}) {
  const isCard = account.kind === "credit_card";
  const yields = account.kind === "checking" || account.kind === "pocket";
  const goal = account.goal;
  const remaining = goal ? (parseMoneyInput(goal.targetText) ?? 0) - (parseMoneyInput(account.balanceText) ?? 0) : 0;
  const suggestedMonthly = goal ? goalMonthlySuggestion(remaining, today, goal.dateText || null) : null;

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <AccountIcon kind={account.kind} color={account.color} className="mt-6" />
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem]">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <FormField label="Nome">
            <Input
              value={account.name}
              onChange={(event) => onChange({ name: event.target.value })}
              maxLength={60}
              className="font-semibold"
            />
          </FormField>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Pill>{KIND_LABELS[account.kind]}</Pill>
            {account.purpose ? <Pill tone="primary">{PURPOSE_LABELS[account.purpose]}</Pill> : null}
          </div>
        </div>
        {isCard ? (
          <p className="col-span-2 text-xs text-muted-foreground sm:pt-7">Vencimento, fechamento e limite no próximo passo.</p>
        ) : (
          <>
            <FormField label="Saldo atual">
              <MoneyInput value={account.balanceText} onValueChange={(balanceText) => onChange({ balanceText })} />
            </FormField>
            {yields ? (
              <FormField label="Rende % CDI">
                <PercentInput
                  value={account.yieldText}
                  onValueChange={(yieldText) => onChange({ yieldText })}
                  placeholder="—"
                />
              </FormField>
            ) : null}
          </>
        )}
        {goal ? (
          <div className="col-span-2 grid grid-cols-2 gap-x-3 gap-y-3 rounded-2xl bg-foreground/[0.04] p-3 sm:col-span-3 sm:grid-cols-3">
            <FormField label="Meta">
              <MoneyInput
                value={goal.targetText}
                onValueChange={(targetText) => onChange({ goal: { ...goal, targetText } })}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Até quando">
              <Input
                type="date"
                value={goal.dateText}
                min={today}
                onChange={(event) => onChange({ goal: { ...goal, dateText: event.target.value } })}
              />
            </FormField>
            <FormField
              label="Guardar por mês"
              className="col-span-2 sm:col-span-1"
              hint={suggestedMonthly ? `Para chegar lá: ${formatCents(suggestedMonthly)}/mês` : undefined}
            >
              <MoneyInput
                value={goal.monthlyText}
                onValueChange={(monthlyText) => onChange({ goal: { ...goal, monthlyText } })}
                placeholder={suggestedMonthly ? centsToInput(suggestedMonthly) : "0,00"}
              />
            </FormField>
          </div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remover ${account.name || "conta"}`}
        onClick={onRemove}
        className="mt-6"
      >
        <X />
      </Button>
    </li>
  );
}

function AddAccountDialog({
  open,
  onClose,
  onAdd,
  accounts,
  today,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (account: DraftAccount) => void;
  accounts: DraftAccount[];
  today: DateStr;
}) {
  const [kind, setKind] = useState<AccountKind>("pocket");
  const [institution, setInstitution] = useState<Institution>("mercadopago");
  const [purpose, setPurpose] = useState<AccountPurpose>("goal");
  const [name, setName] = useState("");
  const finalInstitution = kind === "cash" ? "other" : institution;
  const finalPurpose = kind === "pocket" ? purpose : null;
  const suggestion = suggestAccountName(kind, finalInstitution, finalPurpose);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalName = name.trim() || suggestion;
    if (!finalName) {
      toast.error("Dê um nome para o cofre (ex.: Viagem).");
      return;
    }
    onAdd(
      newDraftAccount(
        `acc-${newDraftId()}`,
        finalName,
        finalInstitution,
        kind,
        finalPurpose,
        kind === "credit_card"
          ? newDraftCard(accounts.find((account) => account.purpose === "card_reserve")?.key ?? null, today)
          : null,
      ),
    );
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar conta ou cofre" size="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField label="Tipo">
          <KindChoice value={kind} onChange={setKind} />
        </FormField>
        {kind !== "cash" ? (
          <FormField label="Instituição">
            <InstitutionChoice value={institution} onChange={setInstitution} />
          </FormField>
        ) : null}
        {kind === "pocket" ? (
          <FormField label="Papel do cofrinho">
            <PurposeChoice value={purpose} onChange={setPurpose} />
          </FormField>
        ) : null}
        <FormField label="Nome">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={suggestion || "Ex.: Viagem"}
            maxLength={60}
          />
        </FormField>
        <FormActions onCancel={onClose} submitLabel="Adicionar" />
      </form>
    </Modal>
  );
}
