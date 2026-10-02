"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleCheck,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { dayInMonth, monthOf } from "@/features/finance/domain/dates";
import { dayMonth, METHOD_LABELS, monthLabel, monthName, relativeDays } from "@/features/finance/domain/labels";
import type { Account, Category, Cents, DateStr, Recurring } from "@/features/finance/domain/types";
import { deleteRecurring, saveRecurring, unskipOccurrence } from "@/features/finance/server/actions";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { ConfirmOccurrenceDialog, useOccurrenceDialog, type OccurrenceTarget } from "./ConfirmOccurrenceDialog";
import { RecurringDialog } from "./RecurringDialog";
import type { RecurringItem, RecurringStatus } from "./recurringView";

type RecurringScreenProps = {
  items: RecurringItem[];
  totals: { incomeCents: Cents; expenseCents: Cents };
  accounts: Account[];
  categories: Category[];
  today: DateStr;
};

type EditorState = { open: boolean; recurring: Recurring | null; type: Recurring["type"] };

const INACTIVE: RecurringStatus["kind"][] = ["paused", "ended"];

export function RecurringScreen({ items, totals, accounts, categories, today }: RecurringScreenProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>({ open: false, recurring: null, type: "expense" });
  const occurrenceDialog = useOccurrenceDialog();
  const hasAccounts = accounts.some((account) => !account.archived);

  const openEditor = (recurring: Recurring | null, type: Recurring["type"] = "expense") =>
    setEditor({ open: true, recurring, type: recurring?.type ?? type });

  // Em vigor primeiro (pela ordem do dia); pausadas e encerradas no fim.
  const sorted = [...items].sort(
    (a, b) => Number(INACTIVE.includes(a.status.kind)) - Number(INACTIVE.includes(b.status.kind)),
  );
  const income = sorted.filter((item) => item.recurring.type === "income");
  const expense = sorted.filter((item) => item.recurring.type === "expense");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fixas"
        description="O que entra e sai todo mês. Elas montam a previsão e pedem confirmação quando vencem."
        actions={
          hasAccounts ? (
            <Button onClick={() => openEditor(null)}>
              <Plus />
              Nova fixa
            </Button>
          ) : null
        }
      />

      {!hasAccounts ? (
        <EmptyState
          icon={Repeat}
          title="Cadastre suas contas primeiro"
          description="As fixas saem de uma conta ou cartão. Faça a configuração inicial e volte aqui."
          actionLabel="Ir para a configuração"
          onAction={() => router.push("/setup")}
        />
      ) : (
        <>
          <Totals
            incomeCents={totals.incomeCents}
            expenseCents={totals.expenseCents}
          />

          <RecurringSection
            title="Entradas"
            emptyText="Cadastre o salário e outras entradas certas para o app prever o mês."
            emptyAction="Nova entrada fixa"
            items={income}
            today={today}
            onNew={() => openEditor(null, "income")}
            onEdit={(recurring) => openEditor(recurring)}
            onConfirm={occurrenceDialog.openFor}
          />
          <RecurringSection
            title="Saídas"
            emptyText="Aluguel, contas e assinaturas: cadastre uma vez e elas entram em todo mês."
            emptyAction="Nova saída fixa"
            items={expense}
            today={today}
            onNew={() => openEditor(null, "expense")}
            onEdit={(recurring) => openEditor(recurring)}
            onConfirm={occurrenceDialog.openFor}
          />
        </>
      )}

      <RecurringDialog
        open={editor.open}
        recurring={editor.recurring}
        defaultType={editor.type}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
        accounts={accounts}
        categories={categories}
        today={today}
      />
      <ConfirmOccurrenceDialog
        {...occurrenceDialog.dialogProps}
        today={today}
        accounts={accounts}
      />
    </div>
  );
}

function Totals({ incomeCents, expenseCents }: { incomeCents: Cents; expenseCents: Cents }) {
  const surplus = incomeCents - expenseCents;
  const cells = [
    { label: "Entradas fixas", cents: incomeCents, className: "text-positive" },
    { label: "Saídas fixas", cents: expenseCents, className: "text-negative" },
    { label: "Sobra estrutural", cents: surplus, className: surplus < 0 ? "text-negative" : "text-foreground" },
  ];
  return (
    <section className="space-y-2">
      <div className="tile grid grid-cols-3 divide-x divide-border">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="min-w-0 p-3 sm:p-4"
          >
            <p className="text-xs leading-tight font-medium text-muted-foreground sm:text-[0.8125rem]">{cell.label}</p>
            <Money
              cents={cell.cents}
              compact
              className={cn("mt-1.5 block text-base font-semibold sm:text-xl", cell.className)}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Por mês, com as anuais divididas por 12. A sobra estrutural é o que fica antes de parcelas, metas e dia a dia.
      </p>
    </section>
  );
}

type RecurringSectionProps = {
  title: string;
  emptyText: string;
  emptyAction: string;
  items: RecurringItem[];
  today: DateStr;
  onNew: () => void;
  onEdit: (recurring: Recurring) => void;
  onConfirm: (target: OccurrenceTarget) => void;
};

function RecurringSection({ title, emptyText, emptyAction, items, today, onNew, onEdit, onConfirm }: RecurringSectionProps) {
  return (
    <Panel
      title={title}
      description={items.length ? `${items.length} ${items.length === 1 ? "fixa" : "fixas"}` : undefined}
      padded={false}
      className="overflow-hidden"
    >
      {items.length ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <RecurringRow
              key={item.recurring.id}
              item={item}
              today={today}
              onEdit={() => onEdit(item.recurring)}
              onConfirm={onConfirm}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={onNew}
          >
            <Plus />
            {emptyAction}
          </Button>
        </div>
      )}
    </Panel>
  );
}

function scheduleLabel(recurring: Recurring) {
  if (recurring.frequency === "yearly" && recurring.monthOfYear) {
    const month = `2001-${String(recurring.monthOfYear).padStart(2, "0")}`;
    return `todo ${dayMonth(dayInMonth(month, recurring.dayOfMonth))}`;
  }
  return `todo dia ${recurring.dayOfMonth}`;
}

function StatusPill({ status, isIncome, today }: { status: RecurringStatus; isIncome: boolean; today: DateStr }) {
  const currentYear = Number(today.slice(0, 4));
  switch (status.kind) {
    case "posted":
      return (
        <Pill tone="positive">
          <Check />
          {isIncome ? "Recebida" : "Paga"} {dayMonth(status.date)}
        </Pill>
      );
    case "pending":
      return (
        <Pill tone="warning">
          {status.days === 0
            ? isIncome
              ? "Entra hoje"
              : "Vence hoje"
            : isIncome
              ? "Ainda não caiu"
              : `Venceu ${relativeDays(status.days)}`}
        </Pill>
      );
    case "upcoming":
      return <Pill>Próxima {relativeDays(status.days)}</Pill>;
    case "skipped":
      return (
        <Pill>
          Pulada em {monthName(monthOf(today))}
          {status.next ? ` · próxima ${dayMonth(status.next)}` : ""}
        </Pill>
      );
    case "not-started":
      return <Pill>Começa em {monthLabel(status.startMonth, currentYear)}</Pill>;
    case "off-month":
      return <Pill>{status.next ? `Próxima ${dayMonth(status.next)}` : "Sem próxima data"}</Pill>;
    case "paused":
      return <Pill>Pausada</Pill>;
    case "ended":
      return <Pill>Encerrada</Pill>;
  }
}

type RecurringRowProps = {
  item: RecurringItem;
  today: DateStr;
  onEdit: () => void;
  onConfirm: (target: OccurrenceTarget) => void;
};

function RecurringRow({ item, today, onEdit, onConfirm }: RecurringRowProps) {
  const { recurring, account, category, status, confirmable, overdue } = item;
  const isIncome = recurring.type === "income";
  const dimmed = INACTIVE.includes(status.kind);
  const meta = [
    scheduleLabel(recurring),
    account?.name ?? "Conta removida",
    account?.card ? "cai na fatura" : recurring.method ? METHOD_LABELS[recurring.method] : null,
    category?.name ?? null,
  ].filter(Boolean);

  return (
    <li className="relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03] sm:px-5">
      {/* Linha inteira abre a edição; os controles por cima ficam com z-10. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ${recurring.description}`}
        className="absolute inset-0 -outline-offset-2"
      />
      <InstitutionMark
        institution={account?.institution ?? "other"}
        name={account?.name}
        className={cn(dimmed && "opacity-50 grayscale")}
      />
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-start justify-between gap-3", dimmed && "opacity-60")}>
          <p className="truncate text-sm font-semibold">{recurring.description}</p>
          <Money
            cents={isIncome ? recurring.amountCents : -recurring.amountCents}
            signed
            className="shrink-0 text-sm font-semibold"
          />
        </div>
        <p className={cn("mt-0.5 truncate text-xs text-muted-foreground", dimmed && "opacity-60")}>
          {meta.join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusPill
            status={status}
            isIncome={isIncome}
            today={today}
          />
          {recurring.isEstimate ? <Pill>estimado</Pill> : null}
          {recurring.autoPost && !dimmed ? <Pill tone="info">lança sozinha</Pill> : null}
          {overdue.map((target) => (
            <button
              key={target.month}
              type="button"
              onClick={() => onConfirm(target)}
              className="relative z-10 rounded-md"
            >
              <Pill tone="warning">{monthName(target.month)} sem confirmar</Pill>
            </button>
          ))}
          {status.kind === "skipped" ? (
            <UndoSkipButton
              recurringId={recurring.id}
              month={monthOf(today)}
            />
          ) : null}
          {status.kind === "pending" && confirmable ? (
            <Button
              size="xs"
              variant="outline"
              className="relative z-10"
              onClick={() => onConfirm(confirmable)}
            >
              Confirmar
            </Button>
          ) : null}
        </div>
      </div>
      <div className="relative z-10 -mt-1 -mr-1.5">
        <RecurringMenu
          item={item}
          onEdit={onEdit}
          onConfirm={onConfirm}
        />
      </div>
    </li>
  );
}

/** Desfaz o "não aconteceu este mês" — a ocorrência volta para a previsão. */
function UndoSkipButton({ recurringId, month }: { recurringId: string; month: string }) {
  const { pending, execute } = useAction();
  return (
    <Button
      size="xs"
      variant="ghost"
      className="relative z-10"
      disabled={pending}
      onClick={() => void execute(() => unskipOccurrence({ recurringId, month }), { success: "Voltou para a previsão." })}
    >
      Desfazer
    </Button>
  );
}

function toPayload(recurring: Recurring) {
  return {
    id: recurring.id,
    type: recurring.type,
    description: recurring.description,
    amountCents: recurring.amountCents,
    isEstimate: recurring.isEstimate,
    categoryId: recurring.categoryId,
    accountId: recurring.accountId,
    method: recurring.method,
    frequency: recurring.frequency,
    dayOfMonth: recurring.dayOfMonth,
    monthOfYear: recurring.monthOfYear,
    startMonth: recurring.startMonth,
    endMonth: recurring.endMonth,
    autoPost: recurring.autoPost,
    active: recurring.active,
  };
}

type RecurringMenuProps = {
  item: RecurringItem;
  onEdit: () => void;
  onConfirm: (target: OccurrenceTarget) => void;
};

function RecurringMenu({ item, onEdit, onConfirm }: RecurringMenuProps) {
  const { recurring, confirmable } = item;
  const confirm = useConfirm();
  const { pending, execute } = useAction();

  function toggleActive() {
    void execute(() => saveRecurring({ ...toPayload(recurring), active: !recurring.active }), {
      success: recurring.active ? "Fixa pausada." : "Fixa retomada.",
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir ${recurring.description}?`,
      description: "Ela sai das previsões. O que já foi confirmado continua no histórico.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) await execute(() => deleteRecurring({ id: recurring.id }), { success: "Fixa excluída." });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações de ${recurring.description}`}
            disabled={pending}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
      >
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!confirmable}
          onClick={() => {
            if (confirmable) onConfirm(confirmable);
          }}
        >
          <CircleCheck />
          Confirmar este mês
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleActive}>
          {recurring.active ? <Pause /> : <Play />}
          {recurring.active ? "Pausar" : "Retomar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
