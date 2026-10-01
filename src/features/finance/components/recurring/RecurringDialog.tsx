"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { addMonths, dayInMonth, monthOf, monthRange } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, METHOD_LABELS, monthLabel, monthName } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import { suggestedStartMonth } from "@/features/finance/domain/recurring";
import type {
  Account,
  Category,
  DateStr,
  MonthKey,
  PaymentMethod,
  Recurring,
  RecurringFrequency,
} from "@/features/finance/domain/types";
import { saveRecurring } from "@/features/finance/server/actions";
import type { RecurringPayload } from "@/features/finance/server/schemas";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { centsToInput } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type RecurringType = Recurring["type"];

const TYPE_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: "expense", label: "Saída" },
  { value: "income", label: "Entrada" },
];

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: "monthly", label: "Todo mês" },
  { value: "yearly", label: "Uma vez por ano" },
];

/** Meios que fazem sentido fora do cartão (no cartão é sempre crédito). */
const CASH_METHODS: PaymentMethod[] = ["pix", "boleto", "debit", "transfer", "cash"];

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Próxima data em que a fixa acontece a partir de hoje (prévia da fatura no cartão). */
function nextOccurrence(
  start: MonthKey,
  day: number,
  frequency: RecurringFrequency,
  monthOfYear: number,
  today: DateStr,
): DateStr {
  const from = start > monthOf(today) ? start : monthOf(today);
  for (let offset = 0; offset < 24; offset += 1) {
    const month = addMonths(from, offset);
    if (frequency === "yearly" && Number(month.slice(5)) !== monthOfYear) continue;
    const date = dayInMonth(month, day);
    if (date >= today) return date;
  }
  return dayInMonth(from, day);
}

type RecurringDialogProps = {
  open: boolean;
  recurring: Recurring | null;
  defaultType: RecurringType;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  today: DateStr;
};

export function RecurringDialog({
  open,
  recurring,
  defaultType,
  onClose,
  accounts,
  categories,
  today,
}: RecurringDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={recurring ? "Editar fixa" : "Nova fixa"}
      description="Algo que se repete todo mês ou todo ano. Entra na previsão do mês e pede confirmação quando vence."
      size="lg"
    >
      <RecurringForm
        key={recurring?.id ?? `new-${defaultType}`}
        recurring={recurring}
        defaultType={defaultType}
        onDone={onClose}
        accounts={accounts}
        categories={categories}
        today={today}
      />
    </Modal>
  );
}

type RecurringFormProps = Omit<RecurringDialogProps, "open" | "onClose"> & { onDone: () => void };

function RecurringForm({ recurring, defaultType, onDone, accounts, categories, today }: RecurringFormProps) {
  const currentMonth = monthOf(today);
  const currentYear = Number(today.slice(0, 4));
  const operating = accounts.find((account) => account.purpose === "operating" && !account.archived) ?? null;
  const firstMoneyAccount = accounts.find((account) => !account.card && !account.archived) ?? null;
  const defaultAccountId = operating?.id ?? firstMoneyAccount?.id ?? accounts[0]?.id ?? "";

  const [type, setType] = useState<RecurringType>(recurring?.type ?? defaultType);
  const [description, setDescription] = useState(recurring?.description ?? "");
  const [amount, setAmount] = useState(recurring ? centsToInput(recurring.amountCents) : "");
  const [isEstimate, setIsEstimate] = useState(recurring?.isEstimate ?? false);
  const [day, setDay] = useState(recurring ? String(recurring.dayOfMonth) : "");
  const [accountId, setAccountId] = useState(recurring?.accountId ?? defaultAccountId);
  const [autoPost, setAutoPost] = useState(
    recurring?.autoPost ?? Boolean(accounts.find((account) => account.id === defaultAccountId)?.card),
  );
  const [categoryId, setCategoryId] = useState(recurring?.categoryId ?? "");
  const [method, setMethod] = useState<PaymentMethod>(
    recurring?.method && recurring.method !== "credit" ? recurring.method : "pix",
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>(recurring?.frequency ?? "monthly");
  const [monthOfYear, setMonthOfYear] = useState(recurring?.monthOfYear ?? Number(today.slice(5, 7)));
  // null = ainda não escolhido: o mês sugerido acompanha o dia digitado (o servidor faz a mesma conta).
  const [startMonth, setStartMonth] = useState<MonthKey | null>(recurring?.startMonth ?? null);
  const [endMonth, setEndMonth] = useState<MonthKey | "">(recurring?.endMonth ?? "");
  const [moreOpen, setMoreOpen] = useState(Boolean(recurring?.endMonth));
  const [errors, setErrors] = useState<Partial<Record<"description" | "amount" | "day" | "account" | "end", string>>>(
    {},
  );
  const { pending, execute } = useAction();

  const account = accounts.find((item) => item.id === accountId) ?? null;
  const isCard = Boolean(account?.card);
  const dayNumber = Number(day);
  const validDay = Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31;
  const effectiveStart = startMonth ?? suggestedStartMonth(today, validDay ? dayNumber : 1);

  const accountOptions = accounts.filter(
    (item) => (!item.archived || item.id === accountId) && (type === "expense" || !item.card),
  );
  const moneyAccounts = accountOptions.filter((item) => !item.card);
  const cardAccounts = accountOptions.filter((item) => item.card);
  const categoryOptions = categories.filter(
    (category) =>
      category.kind === type && !category.systemKey && (!category.archived || category.id === categoryId),
  );

  const startOptions = monthRange(addMonths(currentMonth, -12), addMonths(currentMonth, 24));
  if (!startOptions.includes(effectiveStart)) startOptions.unshift(effectiveStart);
  const endOptions = monthRange(effectiveStart, addMonths(effectiveStart, 36));
  if (endMonth && !endOptions.includes(endMonth)) endOptions.unshift(endMonth);

  const startHint =
    !recurring && !startMonth && validDay && effectiveStart > currentMonth
      ? `O dia ${dayNumber} de ${monthName(currentMonth)} já passou: ela começa em ${monthName(effectiveStart)}.`
      : undefined;

  let cardHint: string | null = null;
  if (account?.card && type === "expense" && validDay) {
    const date = nextOccurrence(effectiveStart, dayNumber, frequency, monthOfYear, today);
    const invoice = invoiceMonthFor(account.card, date);
    cardHint = `A cobrança de ${dayMonth(date)} cai na ${invoiceLabel(invoice, currentYear).toLowerCase()}, que vence ${dayMonth(invoiceDates(account.card, invoice).dueDate)}.`;
  }

  function changeType(next: RecurringType) {
    setType(next);
    if (categories.find((category) => category.id === categoryId)?.kind !== next) setCategoryId("");
    if (next === "income" && isCard) {
      setAccountId(defaultAccountId);
      setAutoPost(false);
    }
  }

  function changeAccount(id: string) {
    setAccountId(id);
    // Assinatura no cartão lança sozinha; conta comum pede confirmação.
    setAutoPost(Boolean(accounts.find((item) => item.id === id)?.card));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountCents = parseMoneyInput(amount);
    const nextErrors = {
      description: description.trim() ? undefined : "Dê um nome, como Aluguel ou Netflix.",
      amount: amountCents && amountCents > 0 ? undefined : "Informe um valor maior que zero.",
      day: validDay ? undefined : "Um dia entre 1 e 31.",
      account: account ? undefined : "Escolha a conta.",
      end: endMonth && endMonth < effectiveStart ? "Termina antes de começar." : undefined,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !amountCents) return;

    const payload: RecurringPayload = {
      ...(recurring ? { id: recurring.id } : {}),
      type,
      description: description.trim(),
      amountCents,
      isEstimate,
      categoryId: categoryId || null,
      accountId,
      method: isCard ? "credit" : type === "expense" ? method : null,
      frequency,
      dayOfMonth: dayNumber,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      startMonth: startMonth ?? undefined,
      endMonth: endMonth || null,
      autoPost,
      active: recurring?.active ?? true,
    };
    await execute(() => saveRecurring(payload), {
      success: recurring ? "Fixa atualizada." : "Fixa criada.",
      onSuccess: onDone,
    });
  }

  const monthOption = (month: MonthKey) => capitalize(monthLabel(month, currentYear));

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-4"
    >
      <Segmented
        options={TYPE_OPTIONS}
        value={type}
        onChange={changeType}
        className="w-fit"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Descrição"
          error={errors.description}
          className="sm:col-span-2"
        >
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={type === "income" ? "Salário" : "Aluguel"}
            maxLength={80}
          />
        </FormField>

        <FormField
          label="Valor"
          error={errors.amount}
        >
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="num"
          />
        </FormField>

        <FormField
          label={frequency === "yearly" ? "Dia" : "Dia do mês"}
          error={errors.day}
          hint={startHint}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            placeholder="5"
            className="num"
          />
        </FormField>

        <label className="flex items-start gap-2.5 sm:col-span-2">
          <Checkbox
            checked={isEstimate}
            onCheckedChange={(checked) => setIsEstimate(checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">Valor varia</span>
            <span className="block text-xs text-muted-foreground">
              Luz, água: o valor vira estimativa e você ajusta ao confirmar.
            </span>
          </span>
        </label>

        <FormField
          label={type === "income" ? "Cai em" : "Sai de"}
          error={errors.account}
        >
          <Select
            value={accountId}
            onChange={(event) => changeAccount(event.target.value)}
          >
            {moneyAccounts.length ? (
              <optgroup label="Contas e cofres">
                {moneyAccounts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {cardAccounts.length ? (
              <optgroup label="Cartões">
                {cardAccounts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </FormField>

        <FormField label="Categoria">
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Sem categoria</option>
            {categoryOptions.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>

        <label className="flex items-start gap-2.5 sm:col-span-2">
          <Checkbox
            checked={autoPost}
            onCheckedChange={(checked) => setAutoPost(checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">Lança sozinha</span>
            <span className="block text-xs text-muted-foreground">
              {isCard
                ? "Assinatura no cartão: entra na data, sem pedir confirmação, e cai na fatura do mês da cobrança."
                : "Débito automático: entra na data, sem pedir confirmação."}
            </span>
            {cardHint ? <span className="mt-1 block text-xs text-muted-foreground">{cardHint}</span> : null}
          </span>
        </label>

        <FormField label="Repete">
          <Segmented
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={setFrequency}
            size="sm"
            className="w-fit"
          />
        </FormField>

        {frequency === "yearly" ? (
          <FormField label="Mês">
            <Select
              value={String(monthOfYear)}
              onChange={(event) => setMonthOfYear(Number(event.target.value))}
            >
              {MONTH_NUMBERS.map((number) => (
                <option
                  key={number}
                  value={number}
                >
                  {capitalize(monthName(`2000-${String(number).padStart(2, "0")}`))}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMoreOpen((current) => !current)}
          aria-expanded={moreOpen}
          className="-ml-2.5"
        >
          Mais opções
          <ChevronDown className={cn("transition-transform", moreOpen && "rotate-180")} />
        </Button>
      </div>

      {moreOpen ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Começa em">
            <Select
              value={effectiveStart}
              onChange={(event) => setStartMonth(event.target.value)}
            >
              {startOptions.map((month) => (
                <option
                  key={month}
                  value={month}
                >
                  {monthOption(month)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Termina em"
            error={errors.end}
          >
            <Select
              value={endMonth}
              onChange={(event) => setEndMonth(event.target.value)}
            >
              <option value="">Sem data para acabar</option>
              {endOptions.map((month) => (
                <option
                  key={month}
                  value={month}
                >
                  {monthOption(month)}
                </option>
              ))}
            </Select>
          </FormField>

          {type === "expense" && !isCard ? (
            <FormField label="Como paga">
              <Select
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              >
                {CASH_METHODS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {METHOD_LABELS[item]}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
        </div>
      ) : null}

      <FormActions
        onCancel={onDone}
        isLoading={pending}
        submitLabel={recurring ? "Salvar" : "Criar fixa"}
      />
    </form>
  );
}
