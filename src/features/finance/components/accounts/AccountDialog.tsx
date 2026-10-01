"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ColorSwatch, FormActions, FormField, Input, Select } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { institutionColor } from "@/features/finance/components/shared/InstitutionMark";
import { useAction } from "@/features/finance/components/shared/useAction";
import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { dayMonth, invoiceLabel, monthShort } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type {
  Account,
  AccountKind,
  AccountPurpose,
  Cents,
  DateStr,
  Institution,
} from "@/features/finance/domain/types";
import { saveAccount } from "@/features/finance/server/actions";
import type { AccountPayload } from "@/features/finance/server/schemas";
import { cn } from "@/lib/utils";
import { centsToInput, formatCents } from "@/lib/utils/format";
import { InstitutionChoice, KindChoice, MoneyInput, PercentInput, PurposeChoice } from "./fields";
import { goalMonthlySuggestion } from "./overview";
import {
  ACCOUNT_COLORS,
  formatDecimal,
  parseDayInput,
  parseDecimalInput,
  suggestAccountName,
  suggestYieldCdiPct,
} from "./presets";

type AccountDialogProps = {
  open: boolean;
  onClose: () => void;
  /** null = nova conta. */
  account: Account | null;
  /** Saldo atual da conta em edição. */
  balanceCents: Cents;
  /** Cofrinhos ativos (opções de cofre da fatura). */
  pockets: Account[];
  today: DateStr;
};

type FormState = {
  kind: AccountKind;
  institution: Institution;
  purpose: AccountPurpose | null;
  name: string;
  color: string;
  yieldText: string;
  balanceText: string;
  closingDay: string;
  dueDay: string;
  limitText: string;
  reserveId: string;
  targetText: string;
  targetDate: string;
  monthlyText: string;
};

type Suggestible = "name" | "color" | "yield";

function initialForm(account: Account | null, balanceCents: Cents, pockets: Account[]): FormState {
  if (account) {
    return {
      kind: account.kind,
      institution: account.institution,
      purpose: account.purpose,
      name: account.name,
      color: account.color,
      yieldText: formatDecimal(account.yieldCdiPct),
      balanceText: centsToInput(balanceCents),
      closingDay: String(account.card?.closingDay ?? 28),
      dueDay: String(account.card?.dueDay ?? 5),
      limitText: account.card?.limitCents != null ? centsToInput(account.card.limitCents) : "",
      reserveId: account.card?.reserveAccountId ?? "",
      targetText: account.goal ? centsToInput(account.goal.targetCents) : "",
      targetDate: account.goal?.targetDate ?? "",
      monthlyText: account.goal?.monthlyCents ? centsToInput(account.goal.monthlyCents) : "",
    };
  }
  // Novo: o caso mais comum é um cofrinho de meta no Mercado Pago.
  return {
    kind: "pocket",
    institution: "mercadopago",
    purpose: "goal",
    name: "",
    color: institutionColor("mercadopago"),
    yieldText: formatDecimal(suggestYieldCdiPct("pocket", "mercadopago")),
    balanceText: "",
    closingDay: "28",
    dueDay: "5",
    limitText: "",
    reserveId: pockets.find((pocket) => pocket.purpose === "card_reserve")?.id ?? "",
    targetText: "",
    targetDate: "",
    monthlyText: "",
  };
}

export function AccountDialog({ open, onClose, account, balanceCents, pockets, today }: AccountDialogProps) {
  const isEdit = account !== null;
  const [form, setForm] = useState(() => initialForm(account, balanceCents, pockets));
  const [touched, setTouched] = useState<Record<Suggestible, boolean>>({ name: false, color: false, yield: false });
  const [showMore, setShowMore] = useState(false);
  const { pending, execute } = useAction();

  const isCard = form.kind === "credit_card";
  const isGoal = form.kind === "pocket" && form.purpose === "goal";
  const yields = form.kind === "checking" || form.kind === "pocket";
  const reserveOptions = pockets.filter((pocket) => pocket.id !== account?.id);
  const colors = ACCOUNT_COLORS.includes(form.color) ? ACCOUNT_COLORS : [form.color, ...ACCOUNT_COLORS];

  function update(patch: Partial<FormState>, field?: Suggestible) {
    setForm((current) => ({ ...current, ...patch }));
    if (field) setTouched((current) => ({ ...current, [field]: true }));
  }

  /** Muda tipo/instituição/papel e, numa conta nova, refaz as sugestões que o usuário não mexeu. */
  function changeShape(patch: Partial<Pick<FormState, "kind" | "institution" | "purpose">>) {
    setForm((current) => {
      const next = { ...current, ...patch };
      if (patch.kind) {
        if (patch.kind === "cash") next.institution = "other";
        if (patch.kind === "pocket") next.purpose = current.kind === "pocket" ? current.purpose : "goal";
        else next.purpose = account && patch.kind === account.kind ? account.purpose : null;
      }
      if (!isEdit) {
        if (!touched.name) next.name = suggestAccountName(next.kind, next.institution, next.purpose);
        if (!touched.color) next.color = institutionColor(next.institution);
        if (!touched.yield) next.yieldText = formatDecimal(suggestYieldCdiPct(next.kind, next.institution));
      }
      return next;
    });
  }

  // Prévia do ciclo: deixa claro em qual fatura cai uma compra de hoje.
  const closingDay = parseDayInput(form.closingDay);
  const dueDay = parseDayInput(form.dueDay);
  let cyclePreview: string | null = null;
  if (isCard && closingDay && dueDay) {
    const config = {
      closingDay,
      dueDay,
      limitCents: null,
      reserveAccountId: null,
      cycleOverrides: account?.card?.cycleOverrides ?? [],
    };
    const month = invoiceMonthFor(config, today);
    const dates = invoiceDates(config, month);
    cyclePreview = `Compra hoje cai na ${invoiceLabel(month, Number(today.slice(0, 4))).toLowerCase()}: fecha ${dayMonth(dates.closingDate)} e vence ${dayMonth(dates.dueDate)}.`;
  }

  const targetCents = parseMoneyInput(form.targetText);
  const savedCents = isEdit ? balanceCents : (parseMoneyInput(form.balanceText) ?? 0);
  const monthlySuggestion =
    isGoal && targetCents ? goalMonthlySuggestion(targetCents - savedCents, today, form.targetDate || null) : null;

  function buildPayload(): AccountPayload | string {
    const name = form.name.trim();
    if (!name) return isGoal ? "Dê um nome para a meta (ex.: Viagem)." : "Dê um nome para a conta.";
    if (form.kind === "pocket" && !form.purpose) return "Escolha o papel do cofrinho.";

    const yieldCdiPct = yields ? parseDecimalInput(form.yieldText) : null;
    if (yieldCdiPct !== null && (Number.isNaN(yieldCdiPct) || yieldCdiPct < 0 || yieldCdiPct > 300)) {
      return "Rendimento inválido: use o % do CDI, entre 0 e 300.";
    }

    let balance: Cents | undefined;
    if (!isCard) {
      const parsed = form.balanceText.trim() ? parseMoneyInput(form.balanceText) : isEdit ? null : 0;
      if (parsed === null) return "Informe o saldo atual.";
      // Na edição só manda se mudou: evita sobrescrever com um saldo velho da tela.
      if (!isEdit || parsed !== balanceCents) balance = parsed;
    }

    let card: AccountPayload["card"] = null;
    if (isCard) {
      if (!closingDay || !dueDay) return "Fechamento e vencimento são dias de 1 a 31.";
      const limitCents = form.limitText.trim() ? parseMoneyInput(form.limitText) : null;
      if (form.limitText.trim() && (limitCents === null || limitCents < 0)) return "Limite inválido.";
      card = { closingDay, dueDay, limitCents, reserveAccountId: form.reserveId || null };
    }

    let goal: AccountPayload["goal"] = null;
    if (isGoal) {
      if (!targetCents || targetCents <= 0) return "Quanto você quer juntar? Informe o valor da meta.";
      const monthlyCents = form.monthlyText.trim() ? parseMoneyInput(form.monthlyText) : null;
      if (form.monthlyText.trim() && (monthlyCents === null || monthlyCents < 0)) return "Valor por mês inválido.";
      goal = { targetCents, targetDate: form.targetDate || null, monthlyCents };
    }

    return {
      id: account?.id,
      name,
      institution: form.kind === "cash" ? "other" : form.institution,
      kind: form.kind,
      purpose: form.kind === "pocket" ? form.purpose : account && form.kind === account.kind ? account.purpose : null,
      color: form.color,
      yieldCdiPct,
      balanceCents: balance,
      card,
      goal,
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildPayload();
    if (typeof payload === "string") {
      toast.error(payload);
      return;
    }
    void execute(() => saveAccount(payload), {
      success: isEdit ? "Conta atualizada." : "Conta criada.",
      onSuccess: onClose,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar conta" : "Nova conta"}
      description={isEdit ? account.name : "Conta no banco, cofrinho, cartão ou dinheiro em espécie."}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField label="Tipo">
          <KindChoice
            value={form.kind}
            onChange={(kind) => changeShape({ kind })}
            // Cartão não vira conta (nem o contrário): faturas e saldo funcionam diferente.
            isDisabled={(kind) => isEdit && (kind === "credit_card") !== (account.kind === "credit_card")}
          />
        </FormField>

        {form.kind !== "cash" ? (
          <FormField label="Instituição">
            <InstitutionChoice value={form.institution} onChange={(institution) => changeShape({ institution })} />
          </FormField>
        ) : null}

        {form.kind === "pocket" ? (
          <FormField label="Papel do cofrinho">
            <PurposeChoice value={form.purpose} onChange={(purpose) => changeShape({ purpose })} />
          </FormField>
        ) : null}

        <FormField label="Nome">
          <Input
            value={form.name}
            onChange={(event) => update({ name: event.target.value }, "name")}
            placeholder={isGoal ? "Ex.: Viagem" : "Nome da conta"}
            maxLength={60}
          />
        </FormField>

        {!isCard ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Saldo atual"
              hint={
                isEdit
                  ? "Corrige o saldo sem criar lançamento. Rendimento se registra em Conferir saldos."
                  : "O que o app do banco mostra hoje."
              }
            >
              <MoneyInput value={form.balanceText} onValueChange={(balanceText) => update({ balanceText })} />
            </FormField>
            {yields ? (
              <FormField label="Rende (% do CDI)" hint="Vazio se não rende.">
                <PercentInput
                  value={form.yieldText}
                  onValueChange={(yieldText) => update({ yieldText }, "yield")}
                  placeholder="Ex.: 120"
                />
              </FormField>
            ) : null}
          </div>
        ) : null}

        {isCard ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Fecha dia">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={form.closingDay}
                  onChange={(event) => update({ closingDay: event.target.value })}
                  className="num"
                />
              </FormField>
              <FormField label="Vence dia">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(event) => update({ dueDay: event.target.value })}
                  className="num"
                />
              </FormField>
            </div>
            {cyclePreview ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[0.8125rem]">
                {cyclePreview}
                {isEdit ? " Mudar as datas reposiciona as compras nas faturas." : null}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Limite" hint="Opcional.">
                <MoneyInput value={form.limitText} onValueChange={(limitText) => update({ limitText })} />
              </FormField>
              <FormField label="Cofre da fatura" hint="Onde você junta o dinheiro da fatura.">
                <Select value={form.reserveId} onChange={(event) => update({ reserveId: event.target.value })}>
                  <option value="">Nenhum</option>
                  {reserveOptions.map((pocket) => (
                    <option key={pocket.id} value={pocket.id}>
                      {pocket.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        ) : null}

        {isGoal ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Quanto quer juntar">
                <MoneyInput value={form.targetText} onValueChange={(targetText) => update({ targetText })} />
              </FormField>
              <FormField label="Até quando" hint="Opcional.">
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => update({ targetDate: event.target.value })}
                />
              </FormField>
            </div>
            <FormField
              label="Quanto guardar por mês"
              hint="Entra no plano do mês como Guardar. Vazio = sem valor fixo."
            >
              <MoneyInput value={form.monthlyText} onValueChange={(monthlyText) => update({ monthlyText })} />
            </FormField>
            {monthlySuggestion ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[0.8125rem]">
                <span>
                  Para chegar lá em {monthShort(form.targetDate.slice(0, 7))}: {formatCents(monthlySuggestion)} por mês.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => update({ monthlyText: centsToInput(monthlySuggestion) })}
                >
                  Usar
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMore((value) => !value)}
            aria-expanded={showMore}
            className="-ml-2.5"
          >
            <ChevronDown className={cn("transition-transform", showMore && "rotate-180")} />
            Mais opções
          </Button>
          {showMore ? (
            <FormField label="Cor" className="mt-3">
              <ColorSwatch value={form.color} onChange={(color) => update({ color }, "color")} colors={colors} />
            </FormField>
          ) : null}
        </div>

        <FormActions onCancel={onClose} isLoading={pending} submitLabel={isEdit ? "Salvar" : "Criar conta"} />
      </form>
    </Modal>
  );
}
