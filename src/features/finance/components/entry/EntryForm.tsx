"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ChevronDown,
  CreditCard,
  Gauge,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { invoiceDates } from "@/features/finance/domain/card";
import { addDays, monthOf } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, METHOD_LABELS, monthLabel, monthShort } from "@/features/finance/domain/labels";
import { guessCategoryByMerchant } from "@/features/finance/domain/merchants";
import { parseMoneyInput } from "@/features/finance/domain/money";
import { parseQuickEntry } from "@/features/finance/domain/quickEntry";
import type { EntrySuggestion } from "@/features/finance/domain/suggestions";
import type { Account, PaymentMethod, Transaction, TxType } from "@/features/finance/domain/types";
import { createEntry, updateEntry } from "@/features/finance/server/actions";
import type { EntryPayload } from "@/features/finance/server/schemas";
import type { ShellData } from "@/features/finance/server/shell";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/FormField";
import { Money } from "@/components/ui/Money";
import { centsToInput, formatCents } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { EntryDraft } from "@/stores/entry-store";
import { AccountPicker, AccountSelect } from "./AccountPicker";
import { CategoryPicker } from "./CategoryPicker";
import { Chip } from "./Chip";
import { DescriptionField } from "./DescriptionField";
import { CardPurchaseOptions, PaymentInvoiceOptions } from "./InvoiceOptions";
import {
  accountLabel,
  accountOptions,
  capitalize,
  cardPurchasePreview,
  categoryKindFor,
  defaultAccountId,
  defaultTransferFromId,
  findSuggestions,
  hintedAccount,
  paymentInvoiceOptions,
  purchaseImpact,
  selectableCategories,
  sortAccounts,
  suggestionPool,
  topCategories,
  transferDescription,
  type EntryMode,
} from "./entryLogic";
import { initialEntryState, nextEntryState, type EntryFormState } from "./entryState";

const MODES: { value: EntryMode; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Entrada" },
  { value: "transfer", label: "Transferir" },
];

const METHODS: PaymentMethod[] = ["pix", "debit", "boleto", "cash"];
const TOP_CATEGORIES = 6;

const PLACEHOLDERS: Record<TxType, string> = {
  expense: "Ex.: ifood 42,90 · uber 23 pix ontem",
  income: "Ex.: salário 5000",
  refund: "Ex.: estorno amazon 89,90",
  transfer: "",
};

const ACCOUNT_QUESTION: Record<TxType, string> = {
  expense: "Como pagou?",
  income: "Onde caiu?",
  refund: "Onde voltou?",
  transfer: "",
};

const LABEL = "text-[0.8125rem] font-semibold";

type Field = "description" | "amount" | "account" | "toAccount";
type Problem = { field: Field; message: string };
type SummaryLine = { key: string; icon: LucideIcon; content: React.ReactNode; alert?: boolean };

type EntryFormProps = {
  shell: ShellData;
  draft: EntryDraft | null;
  editing: Transaction | null;
  /** Alvos do foco inicial (escolhido pelo diálogo) e do foco após salvar/validar. */
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  descriptionRef: React.RefObject<HTMLInputElement | null>;
  amountRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
};

export function EntryForm({ shell, draft, editing, titleRef, descriptionRef, amountRef, onClose }: EntryFormProps) {
  const id = useId();
  const { pending, execute } = useAction();
  const [state, setState] = useState<EntryFormState>(() => initialEntryState(draft, editing, shell.accounts));
  const [problem, setProblem] = useState<Problem | null>(null);

  const { today, accounts, categories, suggestions, accountUsage, balances, monthFree } = shell;
  const currentYear = Number(today.slice(0, 4));
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const isEdit = editing !== null;
  const editingGroup = Boolean(editing?.installment && editing.installment.count > 1);
  const onlyThisInstallment = editingGroup && state.scope === "single";
  const isTransfer = state.mode === "transfer";
  const type: TxType = state.mode === "income" ? (state.refund ? "refund" : "income") : state.mode;

  // ——— O que foi digitado + o que o histórico já sabe ———
  const parsed = state.parseText && !isTransfer ? parseQuickEntry(state.text, today) : null;
  const description = (parsed ? parsed.description : state.text).trim();
  const { exact, matches } = isTransfer
    ? { exact: null, matches: [] as EntrySuggestion[] }
    : findSuggestions(suggestionPool(suggestions, type), description);
  const match = state.picked ?? exact;

  // ——— Conta: escolha manual > citada no texto > cartão (se parcelou) > última usada para isso > padrão ———
  const { primary, others } = accountOptions(accounts, accountUsage, type);
  const allowed = (account: Account | undefined) => account && (type !== "income" || account.kind !== "credit_card");
  const manualAccount = state.accountId ? accountsById.get(state.accountId) : undefined;
  const autoAccount = (accountId: string | null | undefined) => {
    const account = accountId ? accountsById.get(accountId) : undefined;
    return account && !account.archived && allowed(account) ? account.id : null;
  };
  const hint = parsed ? hintedAccount(accounts, parsed, accountUsage, type) : null;
  const wantsInstallments = type === "expense" && (state.installments ?? parsed?.installments ?? 1) > 1;
  const cardForInstallments = wantsInstallments ? primary.find((account) => account.kind === "credit_card") : undefined;

  const accountId = isTransfer
    ? (state.accountId ?? state.base.accountId ?? defaultTransferFromId(accounts, accountUsage))
    : ((allowed(manualAccount) ? manualAccount?.id : null) ??
      hint?.id ??
      cardForInstallments?.id ??
      autoAccount(match?.accountId) ??
      autoAccount(state.base.accountId) ??
      defaultAccountId(type, primary));
  const account = accountId ? accountsById.get(accountId) : undefined;
  const card = !isTransfer && type !== "income" ? (account?.card ?? null) : null;
  const toAccountId = isTransfer ? (state.toAccountId ?? state.base.toAccountId) : null;
  const toAccount = toAccountId ? accountsById.get(toAccountId) : undefined;
  const toCard = toAccount?.card ?? null;

  const date = state.date ?? parsed?.date ?? state.base.date ?? today;
  const yesterday = addDays(today, -1);
  const installments = card && type === "expense" ? (state.installments ?? parsed?.installments ?? 1) : 1;
  const amountCents = state.amountText !== null ? parseMoneyInput(state.amountText) : (parsed?.amountCents ?? null);
  const amountValue = state.amountText ?? (parsed?.amountCents ? centsToInput(parsed.amountCents) : "");

  const categoryKind = categoryKindFor(type);
  const ofKind = (categoryId: string | null | undefined) => {
    const found = categoryId ? categoriesById.get(categoryId) : undefined;
    return found?.kind === categoryKind ? found : null;
  };
  const matchCategory = ofKind(match?.categoryId);
  // Sem histórico para essa descrição: palpite pelo estabelecimento (iFood → Alimentação, Uber → Transporte).
  const merchantCategory =
    !match && type === "expense" && description ? ofKind(guessCategoryByMerchant(description, categories)) : null;
  const category = isTransfer
    ? null
    : state.categoryId !== undefined
      ? ofKind(state.categoryId)
      : (matchCategory ?? merchantCategory);
  const categoryId = category?.id ?? null;

  const usableMethod = (method: PaymentMethod | null | undefined) => (method && method !== "credit" ? method : null);
  const autoMethod =
    usableMethod(parsed?.method) ??
    (match && match.accountId === accountId ? usableMethod(match.method) : null) ??
    (account?.kind === "cash" ? "cash" : account?.purpose === "operating" ? "pix" : null);
  const method = isTransfer || card ? null : state.method !== undefined ? state.method : autoMethod;

  const preview =
    card && !onlyThisInstallment
      ? cardPurchasePreview(card, date, amountCents, installments, state.amountMode, state.invoiceMonth)
      : null;
  const impact =
    !isEdit && type === "expense" && amountCents
      ? purchaseImpact(
          monthFree,
          preview?.firstInvoice ?? monthOf(date),
          preview?.amounts.length ? preview.amounts : [amountCents],
        )
      : null;

  function update(patch: Partial<EntryFormState> | ((current: EntryFormState) => EntryFormState)) {
    setProblem(null);
    setState((current) => (typeof patch === "function" ? patch(current) : { ...current, ...patch }));
  }

  // ——— Ações do formulário ———

  function changeMode(mode: EntryMode) {
    if (mode === state.mode) return;
    const keepAccount = mode !== "transfer" || manualAccount?.kind !== "credit_card";
    update((current) => ({
      ...current,
      mode,
      refund: mode === "income" ? current.refund : false,
      categoryId: undefined,
      method: undefined,
      picked: null,
      invoiceMonth: null,
      installments: null,
      accountId: keepAccount ? current.accountId : null,
      toAccountId: mode === "transfer" ? current.toAccountId : null,
      // Transferência não lê o texto: guarda o que já foi entendido antes de trocar.
      ...(mode === "transfer" && parsed
        ? {
            text: parsed.description,
            parseText: false,
            amountText: current.amountText ?? (parsed.amountCents ? centsToInput(parsed.amountCents) : null),
            date: current.date ?? parsed.date,
          }
        : {}),
    }));
  }

  function changeText(text: string) {
    update({ text, picked: null, parseText: !isEdit && !isTransfer });
  }

  function pickSuggestion(suggestion: EntrySuggestion) {
    update((current) => ({
      ...current,
      text: suggestion.description,
      parseText: false,
      picked: suggestion,
      amountText: current.amountText ?? (parsed?.amountCents ? centsToInput(parsed.amountCents) : null),
      date: current.date ?? parsed?.date ?? null,
      installments: current.installments ?? parsed?.installments ?? null,
      accountId: current.accountId ?? hint?.id ?? null,
    }));
    amountRef.current?.focus();
  }

  function formatAmount() {
    if (state.amountText === null) return;
    const cents = parseMoneyInput(state.amountText);
    if (cents !== null && cents > 0) setState((current) => ({ ...current, amountText: centsToInput(cents) }));
  }

  function setDate(value: string) {
    // A fatura escolhida à mão vale para a data em que foi escolhida.
    update((current) => ({ ...current, date: value, invoiceMonth: current.mode === "transfer" ? current.invoiceMonth : null }));
  }

  function swapAccounts() {
    update((current) => ({ ...current, accountId: toAccountId, toAccountId: accountId, invoiceMonth: null }));
  }

  function validate(): Problem | null {
    if (!isTransfer && !description) return { field: "description", message: "Diga o que foi." };
    if (description.length > 120) return { field: "description", message: "Descrição longa demais (até 120 letras)." };
    if (!amountCents || amountCents <= 0) return { field: "amount", message: "Informe o valor." };
    if (!accountId) return { field: "account", message: "Escolha a conta." };
    if (isTransfer && !toAccountId) return { field: "toAccount", message: "Escolha para onde vai o dinheiro." };
    if (isTransfer && toAccountId === accountId) {
      return { field: "toAccount", message: "Origem e destino precisam ser diferentes." };
    }
    return null;
  }

  function focusField(field: Field) {
    if (field === "description") descriptionRef.current?.focus();
    else if (field === "amount") amountRef.current?.focus();
    else {
      const element = document.getElementById(`${id}-${field}`);
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (element instanceof HTMLSelectElement) element.focus({ preventScroll: true });
    }
  }

  function buildPayload(): EntryPayload {
    return {
      type,
      amountCents: amountCents ?? 0,
      description: isTransfer
        ? description || transferDescription(account, toAccount, state.invoiceMonth, currentYear)
        : description,
      categoryId: isTransfer ? null : categoryId,
      accountId: accountId ?? "",
      toAccountId: isTransfer ? toAccountId : null,
      date,
      method,
      notes: state.notes.trim(),
      installments: onlyThisInstallment ? 1 : installments,
      amountMode: installments > 1 && !onlyThisInstallment ? state.amountMode : "total",
      invoiceMonth: isTransfer ? (toCard ? state.invoiceMonth : null) : card ? state.invoiceMonth : null,
    };
  }

  function successMessage(): string {
    if (isEdit) return editingGroup && !onlyThisInstallment ? "Compra atualizada." : "Lançamento atualizado.";
    if (isTransfer) {
      if (!toCard) return "Transferência registrada.";
      return state.invoiceMonth
        ? `Pagamento da ${invoiceLabel(state.invoiceMonth, currentYear)} registrado.`
        : "Pagamento da fatura registrado.";
    }
    if (preview) {
      const invoice = invoiceLabel(preview.firstInvoice, currentYear);
      if (type === "refund") return `Estorno lançado na ${invoice}.`;
      return installments > 1 ? `${installments}× lançadas, a 1ª na ${invoice}.` : `Lançado na ${invoice}.`;
    }
    if (type === "income") return "Entrada lançada.";
    if (type === "refund") return "Estorno lançado.";
    return "Gasto lançado.";
  }

  async function submit(another: boolean) {
    if (pending) return;
    const found = validate();
    if (found) {
      setProblem(found);
      focusField(found.field);
      return;
    }
    const payload = buildPayload();
    const ok = await execute(
      () =>
        editing
          ? updateEntry({ id: editing.id, scope: editingGroup ? state.scope : "single", entry: payload })
          : createEntry(payload),
      { success: successMessage() },
    );
    if (!ok) return;
    if (another && !isEdit) {
      setState(nextEntryState(state, { accountId, toAccountId, date }));
      (isTransfer ? amountRef : descriptionRef).current?.focus();
    } else {
      onClose();
    }
  }

  // ——— Textos de apoio ———

  const title =
    draft?.title ??
    (isEdit
      ? isTransfer
        ? "Editar transferência"
        : editingGroup
          ? "Editar compra parcelada"
          : "Editar lançamento"
      : "Novo lançamento");

  const descriptionHint = (() => {
    const parts: string[] = [];
    if (parsed && description && description !== state.text.trim()) parts.push(`Vai como “${description}”`);
    if (exact && !state.picked && state.categoryId === undefined && category) {
      parts.push(`${category.name}, como da última vez`);
    } else if (!match && state.categoryId === undefined && merchantCategory) {
      parts.push(`${merchantCategory.name}, pelo nome`);
    }
    if (parsed?.installments && parsed.installments > 1 && !card) parts.push("parcelado só no cartão");
    return parts.length ? capitalize(parts.join(" · ")) : null;
  })();

  const amountLabel = onlyThisInstallment
    ? "Valor desta parcela"
    : installments > 1
      ? state.amountMode === "installment"
        ? "Valor da parcela"
        : "Valor total"
      : "Valor";

  const amountHint =
    preview && installments > 1 && preview.totalCents && preview.installmentCents
      ? state.amountMode === "installment"
        ? `Total ${formatCents(preview.totalCents)}`
        : `${installments}× de ${formatCents(preview.installmentCents)}`
      : null;

  const lines: SummaryLine[] = [];
  if (onlyThisInstallment && editing?.installment) {
    lines.push({
      key: "installment",
      icon: CreditCard,
      content: `Parcela ${editing.installment.index} de ${editing.installment.count}${
        editing.invoiceMonth ? ` · ${invoiceLabel(editing.invoiceMonth, currentYear)}` : ""
      } · fatura e data não mudam`,
    });
  } else if (preview) {
    lines.push({
      key: "card",
      icon: CreditCard,
      content:
        type === "refund"
          ? `Abate da ${invoiceLabel(preview.firstInvoice, currentYear)}`
          : preview.count > 1
            ? `${preview.count}×${preview.installmentCents ? ` de ${formatCents(preview.installmentCents)}` : ""} · fatura de ${monthShort(preview.firstInvoice)} até ${monthShort(preview.lastInvoice)}${
                preview.settledCount ? ` · ${preview.settledCount} em faturas já pagas` : ""
              }`
            : preview.settledCount
              ? `Cai na ${invoiceLabel(preview.firstInvoice, currentYear)} · já paga, fica no histórico`
              : `Cai na ${invoiceLabel(preview.firstInvoice, currentYear)} · vence ${dayMonth(preview.dueDate)}`,
    });
  }
  if (impact) {
    const perMonth = preview && preview.count > 1 ? preview.installmentCents : null;
    lines.push({
      key: "impact",
      icon: Gauge,
      alert: impact.afterCents < 0 || impact.negativeMonth !== null,
      content: (
        <>
          {capitalize(monthLabel(impact.month, currentYear))}: ainda pode gastar{" "}
          <Money
            cents={impact.beforeCents}
            compact
          />{" "}
          →{" "}
          <Money
            cents={impact.afterCents}
            compact
            className={impact.afterCents < 0 ? "font-semibold text-negative" : "font-semibold text-foreground"}
          />
          {perMonth && preview ? ` · + ${formatCents(perMonth)}/mês até ${monthShort(preview.lastInvoice)}` : null}
          {impact.negativeMonth ? ` · fica no vermelho em ${monthShort(impact.negativeMonth)}` : null}
        </>
      ),
    });
  }
  if (isTransfer && toCard) {
    lines.push({
      key: "payment",
      icon: CreditCard,
      content: state.invoiceMonth
        ? `Paga a ${invoiceLabel(state.invoiceMonth, currentYear)} · vence ${dayMonth(invoiceDates(toCard, state.invoiceMonth).dueDate)}`
        : "Paga a fatura em aberto mais antiga",
    });
  }

  const modeOptions = isEdit ? (isTransfer || editingGroup ? [] : MODES.slice(0, 2)) : MODES;
  const transferOptions = [
    ...sortAccounts(accounts.filter((item) => !item.card), accountUsage),
    ...sortAccounts(accounts.filter((item) => item.card), accountUsage),
  ];
  const errorFor = (field: Field) => (problem?.field === field ? problem.message : undefined);

  if (!accounts.length) {
    return (
      <div className="space-y-4 p-5">
        <DialogTitle className="text-base font-bold">Antes de lançar</DialogTitle>
        <p className="text-sm text-muted-foreground">Cadastre suas contas e o cartão para começar.</p>
        <Link
          href="/setup"
          onClick={onClose}
          className={buttonVariants()}
        >
          Configurar contas
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void submit(event.shiftKey);
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border py-2.5 pr-2.5 pl-4 sm:pl-5">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate text-base font-bold tracking-tight focus:outline-none"
        >
          {title}
        </DialogTitle>
        <DialogClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fechar"
            />
          }
        >
          <X />
        </DialogClose>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {modeOptions.length ? (
          <div
            role="group"
            aria-label="Tipo de lançamento"
            className={cn("grid gap-1 rounded-lg bg-muted p-1", modeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2")}
          >
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={state.mode === option.value}
                onClick={() => changeMode(option.value)}
                className={cn(
                  "h-9 rounded-md text-sm font-semibold transition-colors",
                  state.mode === option.value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {state.mode === "income" && !onlyThisInstallment ? (
          <label className="flex items-start gap-2.5">
            <Checkbox
              checked={state.refund}
              onCheckedChange={(checked) => update({ refund: checked, categoryId: undefined, picked: null })}
              className="mt-0.5"
            />
            <span className="text-[0.8125rem]">
              <span className="font-semibold">É reembolso ou estorno de um gasto</span>
              <span className="block text-xs text-muted-foreground">
                Abate o gasto da categoria. Pode voltar no cartão.
              </span>
            </span>
          </label>
        ) : null}

        {editingGroup && editing?.installment ? (
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[0.8125rem]">
              Editando a compra:{" "}
              <span className="num font-semibold">
                {editing.installment.count}× de {formatCents(editing.amountCents)}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={state.scope === "group"}
                onClick={() => update({ scope: "group" })}
              >
                A compra inteira
              </Chip>
              <Chip
                active={state.scope === "single"}
                onClick={() => update({ scope: "single" })}
              >
                Só esta parcela ({editing.installment.index}/{editing.installment.count})
              </Chip>
            </div>
          </div>
        ) : null}

        {isTransfer ? null : (
          <DescriptionField
            id={`${id}-description`}
            label="O que foi?"
            value={state.text}
            placeholder={PLACEHOLDERS[type]}
            onChange={changeText}
            suggestions={matches}
            onPick={pickSuggestion}
            describe={(suggestion) => {
              const suggestionCategory = suggestion.categoryId
                ? (categoriesById.get(suggestion.categoryId) ?? null)
                : null;
              const suggestionAccount = accountsById.get(suggestion.accountId);
              return {
                category: suggestionCategory,
                meta: [suggestionCategory?.name, suggestionAccount && accountLabel(suggestionAccount, accounts, "pay")]
                  .filter(Boolean)
                  .join(" · "),
              };
            }}
            inputRef={descriptionRef}
            hint={descriptionHint}
            error={errorFor("description")}
          />
        )}

        <div className="space-y-1.5">
          <label
            htmlFor={`${id}-amount`}
            className={LABEL}
          >
            {amountLabel}
          </label>
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
              problem?.field === "amount" ? "border-negative" : "border-input",
            )}
          >
            <span className="text-lg font-semibold text-muted-foreground">R$</span>
            <input
              ref={amountRef}
              id={`${id}-amount`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="0,00"
              aria-invalid={problem?.field === "amount" ? true : undefined}
              value={amountValue}
              onChange={(event) => update({ amountText: event.target.value })}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={formatAmount}
              className="num h-14 w-full min-w-0 bg-transparent text-3xl font-semibold outline-none placeholder:text-muted-foreground/40"
            />
          </div>
          {errorFor("amount") ? (
            <p className="text-xs text-negative">{errorFor("amount")}</p>
          ) : amountHint ? (
            <p className="num text-xs text-muted-foreground">{amountHint}</p>
          ) : null}
        </div>

        {isTransfer ? (
          <>
            <div className="space-y-2">
              <AccountSelect
                id={`${id}-account`}
                label="De"
                accounts={accounts}
                options={transferOptions}
                value={accountId}
                onChange={(value) => update({ accountId: value })}
                balances={balances}
                deltaCents={amountCents ? -amountCents : null}
                error={errorFor("account")}
              />
              <div className="-my-1 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Inverter origem e destino"
                  onClick={swapAccounts}
                >
                  <ArrowDownUp />
                </Button>
              </div>
              <AccountSelect
                id={`${id}-toAccount`}
                label="Para"
                accounts={accounts}
                options={transferOptions}
                value={toAccountId}
                onChange={(value) => update({ toAccountId: value, invoiceMonth: null })}
                balances={balances}
                deltaCents={amountCents}
                error={errorFor("toAccount")}
              />
            </div>
            {toCard ? (
              <PaymentInvoiceOptions
                card={toCard}
                months={paymentInvoiceOptions(toCard, today, state.invoiceMonth)}
                value={state.invoiceMonth}
                onChange={(month) => update({ invoiceMonth: month })}
                currentYear={currentYear}
                today={today}
              />
            ) : null}
            <div className="space-y-1.5">
              <label
                htmlFor={`${id}-description`}
                className={LABEL}
              >
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                ref={descriptionRef}
                id={`${id}-description`}
                type="text"
                autoComplete="off"
                maxLength={120}
                value={state.text}
                onChange={(event) => changeText(event.target.value)}
                placeholder={transferDescription(account, toAccount, state.invoiceMonth, currentYear)}
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-base shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none sm:text-sm"
              />
            </div>
          </>
        ) : onlyThisInstallment ? null : (
          <div className="space-y-3">
            <AccountPicker
              id={`${id}-account`}
              label={ACCOUNT_QUESTION[type]}
              accounts={accounts}
              primary={primary}
              others={others}
              value={accountId}
              onChange={(value) => update({ accountId: value, invoiceMonth: null })}
              balances={balances}
              context={type === "expense" ? "pay" : "other"}
              date={date}
              error={errorFor("account")}
            />
            {card && preview ? (
              <CardPurchaseOptions
                key={state.round}
                id={id}
                card={card}
                allowInstallments={type === "expense" && (!isEdit || editingGroup)}
                installments={installments}
                onInstallments={(count) => update({ installments: count })}
                amountMode={state.amountMode}
                onAmountMode={(mode) => update({ amountMode: mode })}
                autoInvoice={preview.autoInvoice}
                chosenInvoice={state.invoiceMonth}
                onInvoice={(month) => update({ invoiceMonth: month })}
                currentYear={currentYear}
              />
            ) : null}
          </div>
        )}

        {isTransfer ? null : (
          <CategoryPicker
            key={state.round}
            id={`${id}-category`}
            top={topCategories(categories, suggestions, categoryKind, TOP_CATEGORIES)}
            all={selectableCategories(categories, categoryKind)}
            selected={category}
            onSelect={(value) => update({ categoryId: value })}
          />
        )}

        {onlyThisInstallment ? null : (
          <div
            role="group"
            aria-labelledby={`${id}-date-label`}
            className="space-y-2"
          >
            <p
              id={`${id}-date-label`}
              className={LABEL}
            >
              Quando?
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                active={date === today}
                onClick={() => setDate(today)}
              >
                Hoje
              </Chip>
              <Chip
                active={date === yesterday}
                onClick={() => setDate(yesterday)}
              >
                Ontem
              </Chip>
              <input
                type="date"
                aria-label="Outra data"
                value={date}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
                className={cn(
                  "num h-9 rounded-lg border bg-card px-2.5 text-base font-semibold transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none sm:text-[0.8125rem]",
                  date !== today && date !== yesterday
                    ? "border-primary text-foreground ring-1 ring-primary/40"
                    : "border-border text-muted-foreground",
                )}
              />
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            aria-expanded={state.showMore}
            aria-controls={`${id}-more`}
            onClick={() => update({ showMore: !state.showMore })}
            className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-muted-foreground hover:text-foreground"
          >
            Mais opções
            <ChevronDown className={cn("size-3.5 transition-transform", state.showMore && "rotate-180")} />
          </button>
          {state.showMore ? (
            <div
              id={`${id}-more`}
              className="mt-3 space-y-4"
            >
              {type === "expense" && !card && !onlyThisInstallment ? (
                <div
                  role="group"
                  aria-labelledby={`${id}-method-label`}
                  className="space-y-2"
                >
                  <p
                    id={`${id}-method-label`}
                    className={LABEL}
                  >
                    Meio de pagamento
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((item) => (
                      <Chip
                        key={item}
                        active={method === item}
                        onClick={() => update({ method: method === item ? null : item })}
                      >
                        {METHOD_LABELS[item]}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-notes`}
                  className={LABEL}
                >
                  Observações
                </label>
                <Textarea
                  id={`${id}-notes`}
                  value={state.notes}
                  maxLength={500}
                  rows={2}
                  onChange={(event) => update({ notes: event.target.value })}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 space-y-2.5 border-t border-border bg-muted/40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        {lines.length ? (
          <ul
            className="space-y-1"
            aria-live="polite"
          >
            {lines.map((line) => {
              const Icon = line.icon;
              return (
                <li
                  key={line.key}
                  className={cn(
                    "flex items-start gap-2 text-xs leading-relaxed",
                    line.alert ? "text-negative" : "text-muted-foreground",
                  )}
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{line.content}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="flex gap-2">
          {isEdit ? null : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => void submit(true)}
              title="Salvar e lançar outro (⌘⇧↵)"
              className="flex-1"
            >
              <span className="sm:hidden">Salvar e outro</span>
              <span className="hidden sm:inline">Salvar e lançar outro</span>
            </Button>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            title="Salvar (⌘↵)"
            className="flex-1"
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {isEdit ? "Salvar alterações" : "Salvar"}
            <kbd className="hidden rounded bg-primary-foreground/15 px-1 font-mono text-[0.625rem] sm:inline">⌘↵</kbd>
          </Button>
        </div>
      </footer>
    </form>
  );
}
