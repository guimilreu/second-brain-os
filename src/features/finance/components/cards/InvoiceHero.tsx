"use client";

import Link from "next/link";
import { ArrowRight, PiggyBank } from "lucide-react";
import { addMonths, diffDays } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, relativeDays, weekdayDayMonth } from "@/features/finance/domain/labels";
import type { Cents, DateStr, MonthKey } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { useAction } from "@/features/finance/components/shared/useAction";
import { settleInvoicesOutside } from "@/features/finance/server/actions";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { useEntryStore, type EntryDraft } from "@/stores/entry-store";
import { headlineCents, inAccount, invoiceStatus, isEmptyInvoice, RESERVE_MIN_GAP } from "./cardLabels";
import type { CardScreen, InvoiceView, ReserveStatus } from "./cardView";
import { InvoiceTools } from "./InvoiceTools";

type InvoiceHeroProps = {
  cardId: string;
  invoice: InvoiceView;
  today: DateStr;
  currentYear: number;
  reserve: ReserveStatus;
  payDraft: EntryDraft | null;
  reserveDraft: EntryDraft | null;
  settle: CardScreen["settle"];
};

/** Destaque da fatura escolhida + quanto precisa estar guardado no cofre da fatura hoje. */
export function InvoiceHero({
  cardId,
  invoice,
  today,
  currentYear,
  reserve,
  payDraft,
  reserveDraft,
  settle,
}: InvoiceHeroProps) {
  return (
    <section className="tile relative overflow-hidden animate-rise">
      <div aria-hidden className="pointer-events-none absolute -top-28 -left-20 size-96 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,#820ad1_40%,transparent),transparent_65%)] blur-2xl" />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <InvoiceSummaryBlock
          cardId={cardId}
          invoice={invoice}
          today={today}
          currentYear={currentYear}
          settle={settle}
        />
        <ReserveBlock
          reserve={reserve}
          currentYear={currentYear}
          payDraft={payDraft}
          reserveDraft={reserveDraft}
        />
      </div>
    </section>
  );
}

const HEADLINE_LABELS = {
  future: "Previsto",
  open: "Até agora",
  closed: "Total",
  overdue: "Total",
  paid: "Total",
} as const;

type Tone = "default" | "warning" | "negative" | "positive";

const TONE_CLASSES: Record<Tone, string> = {
  default: "text-foreground",
  warning: "text-warning",
  negative: "text-negative",
  positive: "text-positive",
};

function statusLine(invoice: InvoiceView, today: DateStr): { text: string; tone: Tone } {
  switch (invoice.state) {
    case "open":
      return { text: `Fecha ${relativeDays(diffDays(today, invoice.closingDate))}`, tone: "default" };
    case "closed": {
      const days = diffDays(today, invoice.dueDate);
      return { text: `Vence ${relativeDays(days)}`, tone: days <= 2 ? "warning" : "default" };
    }
    case "overdue":
      return { text: `Venceu ${relativeDays(diffDays(today, invoice.dueDate))}`, tone: "negative" };
    case "future":
      return { text: `Previsão. Recebe compras a partir de ${dayMonth(invoice.periodStart)}.`, tone: "default" };
    case "paid":
      if (isEmptyInvoice(invoice)) return { text: "Nenhuma compra nesta fatura.", tone: "default" };
      if (invoice.settledOutside && !invoice.lastPaymentDate) {
        return { text: "Paga antes do app: as compras dela contam só nos gastos do mês.", tone: "positive" };
      }
      return {
        text: invoice.lastPaymentDate ? `Paga em ${dayMonth(invoice.lastPaymentDate)}` : "Paga",
        tone: "positive",
      };
  }
}

function InvoiceSummaryBlock({
  cardId,
  invoice,
  today,
  currentYear,
  settle,
}: Pick<InvoiceHeroProps, "cardId" | "invoice" | "today" | "currentYear" | "settle">) {
  const status = invoiceStatus(invoice);
  const line = statusLine(invoice, today);
  const label = invoiceLabel(invoice.month, currentYear);
  const partiallyPaid = invoice.paidCents > 0 && invoice.remainingCents > 0;
  const awaitingPayment = invoice.state === "closed" || invoice.state === "overdue";
  const { breakdown } = invoice;

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight">
            {label}
          </h2>
          <Pill tone={status.tone}>
            {status.label}
          </Pill>
        </div>
        <InvoiceTools
          cardId={cardId}
          invoice={invoice}
          label={label}
        />
      </div>

      <p className="mt-4 text-[0.8125rem] font-medium text-muted-foreground">
        {awaitingPayment && partiallyPaid ? "Falta pagar" : HEADLINE_LABELS[invoice.state]}
      </p>
      <Money
        cents={headlineCents(invoice)}
        className="display mt-2 block text-5xl sm:text-6xl"
      />
      <p className={cn("mt-2 text-sm font-semibold", TONE_CLASSES[line.tone])}>
        {line.text}
      </p>
      {settle.canMark || settle.canUndo ? (
        <SettleToggle
          cardId={cardId}
          month={invoice.month}
          undo={settle.canUndo}
        />
      ) : null}

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            Fecha
          </dt>
          <dd className="mt-0.5 text-[0.8125rem] font-semibold">
            {weekdayDayMonth(invoice.closingDate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            Vence
          </dt>
          <dd className="mt-0.5 text-[0.8125rem] font-semibold">
            {weekdayDayMonth(invoice.dueDate)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">
            Compras de
          </dt>
          <dd className="mt-0.5 text-[0.8125rem] font-semibold">
            {dayMonth(invoice.periodStart)} a {dayMonth(invoice.periodEnd)}
          </dd>
        </div>
      </dl>

      {partiallyPaid ? (
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Pago{" "}
              <Money
                cents={invoice.paidCents}
                className="font-semibold text-foreground"
              />
            </span>
            <span>
              de{" "}
              <Money cents={invoice.totalCents} />
            </span>
          </div>
          <Meter
            value={(invoice.paidCents / invoice.totalCents) * 100}
            tone="positive"
          />
        </div>
      ) : null}

      {invoice.remainingCents < 0 ? (
        <p className="mt-4 text-[0.8125rem] text-muted-foreground">
          Você pagou{" "}
          <Money
            cents={-invoice.remainingCents}
            className="font-semibold text-foreground"
          />{" "}
          a mais nesta fatura.
        </p>
      ) : null}

      {invoice.state === "open" && breakdown.predictedCents > 0 ? (
        <p className="mt-4 text-[0.8125rem] text-muted-foreground">
          Com{" "}
          <Money
            cents={breakdown.predictedCents}
            className="font-semibold text-foreground"
          />{" "}
          de fixas que ainda vão cair, deve fechar em{" "}
          <Money
            cents={invoice.forecastCents}
            className="font-semibold text-foreground"
          />
          .
        </p>
      ) : null}

      {invoice.state === "future" ? (
        <div className="mt-5 space-y-1.5 text-[0.8125rem]">
          <BreakdownRow
            label="Parcelas já lançadas"
            cents={breakdown.installmentsCents}
          />
          <BreakdownRow
            label="Fixas previstas"
            cents={breakdown.fixedCents + breakdown.predictedCents}
          />
          {breakdown.otherCents !== 0 ? (
            <BreakdownRow
              label="Compras já lançadas"
              cents={breakdown.otherCents}
            />
          ) : null}
          <p className="pt-1 text-xs text-muted-foreground">
            Compras novas de {dayMonth(invoice.periodStart)} a {dayMonth(invoice.periodEnd)} também entram aqui.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Fatura que já estava paga quando o cartão entrou no app: marca (com as anteriores) ou desfaz. */
function SettleToggle({ cardId, month, undo }: { cardId: string; month: MonthKey; undo: boolean }) {
  const { pending, execute } = useAction();

  function toggle() {
    void execute(() => settleInvoicesOutside({ cardId, month: undo ? addMonths(month, -1) : month }), {
      success: undo ? "A fatura voltou a ficar em aberto." : "Marcada como paga antes do app.",
    });
  }

  return (
    <p className="mt-1 text-[0.8125rem] text-muted-foreground">
      {undo ? "Não estava paga? " : "Pagou antes de começar a usar o app? "}
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="font-semibold text-primary-ink hover:underline disabled:opacity-60"
      >
        {undo ? "Desfazer" : "Marcar como paga"}
      </button>
    </p>
  );
}

function BreakdownRow({ label, cents }: { label: string; cents: Cents }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">
        {label}
      </span>
      <Money
        cents={cents}
        className="font-semibold"
      />
    </div>
  );
}

const PART_HINTS = {
  open: "até agora",
  closed: "fechada",
  overdue: "atrasada",
  future: "futura",
  paid: "paga",
} as const;

function ReserveBlock({
  reserve,
  currentYear,
  payDraft,
  reserveDraft,
}: Pick<InvoiceHeroProps, "reserve" | "currentYear" | "payDraft" | "reserveDraft">) {
  const openNew = useEntryStore((state) => state.openNew);
  const { account } = reserve;
  const gap = reserve.neededCents - reserve.balanceCents;

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-muted/30 p-5 md:p-6 lg:border-t-0 lg:border-l">
      <div className="flex items-center gap-2.5">
        {account ? (
          <InstitutionMark
            institution={account.institution}
            name={account.name}
            size="sm"
          />
        ) : (
          <span className="grid size-6 place-items-center rounded-md bg-muted text-muted-foreground">
            <PiggyBank className="size-3.5" />
          </span>
        )}
        <p className="truncate text-sm font-bold">
          {account ? `Reserva ${inAccount(account)}` : "Reserva da fatura"}
        </p>
      </div>

      {account ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Money
              cents={reserve.balanceCents}
              className="text-2xl font-semibold"
            />
            {reserve.neededCents > 0 ? (
              <span className="text-xs text-muted-foreground">
                guardado de{" "}
                <Money cents={reserve.neededCents} />
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                guardado
              </span>
            )}
          </div>
          {reserve.neededCents > 0 ? (
            <Meter
              value={(reserve.balanceCents / reserve.neededCents) * 100}
              tone={gap >= RESERVE_MIN_GAP ? "warning" : "positive"}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-[0.8125rem] text-muted-foreground">
          Ligue um cofre a este cartão para o app mostrar quanto guardar até o vencimento.
        </p>
      )}

      {reserve.parts.length ? (
        <ul className="space-y-1.5">
          {reserve.parts.map((part) => (
            <li
              key={part.month}
              className="flex items-center justify-between gap-3 text-[0.8125rem]"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {invoiceLabel(part.month, currentYear)} · {PART_HINTS[part.state]}
              </span>
              <Money
                cents={part.remainingCents}
                className="font-semibold"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <ReserveVerdict
        hasAccount={Boolean(account)}
        neededCents={reserve.neededCents}
        gapCents={gap}
      />

      {account ? null : (
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-primary-ink hover:underline"
        >
          Configurar em Contas e cofres
          <ArrowRight className="size-3.5" />
        </Link>
      )}

      {reserveDraft || payDraft ? (
        <div className="mt-auto flex flex-col gap-2 sm:flex-row lg:flex-col">
          {reserveDraft ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => openNew(reserveDraft)}
            >
              Guardar{" "}
              <Money cents={reserveDraft.amountCents ?? 0} />
            </Button>
          ) : null}
          {payDraft ? (
            <Button
              className="flex-1"
              onClick={() => openNew(payDraft)}
            >
              Pagar{" "}
              <Money cents={payDraft.amountCents ?? 0} />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReserveVerdict({
  hasAccount,
  neededCents,
  gapCents,
}: {
  hasAccount: boolean;
  neededCents: Cents;
  gapCents: Cents;
}) {
  if (neededCents <= 0) {
    return (
      <p className="text-[0.8125rem] text-muted-foreground">
        Nenhuma fatura em aberto agora.
      </p>
    );
  }
  if (!hasAccount) {
    return (
      <p className="flex items-center justify-between gap-3 border-t border-border pt-2 text-[0.8125rem] font-semibold">
        <span>Para pagar</span>
        <Money cents={neededCents} />
      </p>
    );
  }
  if (gapCents >= RESERVE_MIN_GAP) {
    return (
      <p className="flex items-center justify-between gap-3 border-t border-border pt-2 text-[0.8125rem] font-semibold text-warning">
        <span>Falta guardar</span>
        <Money cents={gapCents} />
      </p>
    );
  }
  return (
    <p className="flex items-center justify-between gap-3 border-t border-border pt-2 text-[0.8125rem] font-semibold text-positive">
      <span>Tudo guardado</span>
      {gapCents <= -RESERVE_MIN_GAP ? (
        <span className="text-xs font-medium text-muted-foreground">
          sobra{" "}
          <Money cents={-gapCents} />
        </span>
      ) : null}
    </p>
  );
}
