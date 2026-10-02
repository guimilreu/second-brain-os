"use client";

import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Receipt,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { useAction } from "@/features/finance/components/shared/useAction";
import { dayMonth, invoiceLabel, monthShort, PURPOSE_LABELS } from "@/features/finance/domain/labels";
import { deleteAccount, setAccountArchived } from "@/features/finance/server/actions";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";
import { useEntryStore } from "@/stores/entry-store";
import { AccountIcon } from "./fields";
import type { AccountItem } from "./overview";

type AccountRowProps = {
  item: AccountItem;
  /** Cofre do dia a dia: origem padrão de "Guardar aqui" e do pagamento da fatura sem cofre. */
  operatingId: string | null;
  currentYear: number;
  onEdit: () => void;
};

export function AccountRow({ item, operatingId, currentYear, onEdit }: AccountRowProps) {
  const { account, card } = item;
  const href = card ? `/cards/${account.id}` : `/transactions?account=${account.id}`;

  return (
    <li className={cn("group flex items-center gap-2 px-4 py-3", account.archived && "opacity-70")}>
      <Link
        href={href}
        className="-mx-2 -my-1.5 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/[0.03] focus-visible:bg-muted/50"
      >
        <AccountIcon kind={account.kind} color={account.color} className="self-start" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="max-w-full truncate text-sm font-semibold">{account.name}</p>
            {account.purpose ? <Pill>{PURPOSE_LABELS[account.purpose]}</Pill> : null}
            {account.yieldCdiPct ? (
              <Pill tone="positive" className="num">
                {account.yieldCdiPct}% CDI
              </Pill>
            ) : null}
          </div>
          <AccountDetail item={item} currentYear={currentYear} />
        </div>
        <div className="shrink-0 self-start text-right">
          {card ? (
            <>
              <Money cents={card.currentDebtCents} className="text-sm font-semibold" />
              <p className="text-xs text-muted-foreground">a pagar</p>
            </>
          ) : (
            <>
              <Money
                cents={item.balanceCents}
                className={cn("text-sm font-semibold", item.balanceCents < 0 && "text-negative")}
              />
              {item.monthlyYieldCents > 0 ? (
                <p className="num text-xs text-positive">≈ {formatCents(item.monthlyYieldCents)}/mês</p>
              ) : null}
            </>
          )}
        </div>
      </Link>
      <AccountMenu item={item} operatingId={operatingId} currentYear={currentYear} onEdit={onEdit} />
    </li>
  );
}

function AccountDetail({ item, currentYear }: { item: AccountItem; currentYear: number }) {
  const { goal, reserve, card } = item;

  if (goal) {
    return (
      <div className="mt-2 space-y-1.5">
        <Meter value={goal.percent} color={item.account.color} />
        <p className="text-xs text-muted-foreground">
          {goal.reached ? (
            <span className="font-semibold text-positive">
              Meta atingida · <Money cents={goal.targetCents} compact />
            </span>
          ) : (
            <>
              <Money cents={goal.savedCents} compact /> de <Money cents={goal.targetCents} compact />
              {goal.monthlyCents ? (
                <>
                  {" · "}
                  <Money cents={goal.monthlyCents} compact />
                  /mês
                </>
              ) : null}
              {goal.targetMonth ? (
                <span className={cn(goal.late && "font-semibold text-warning")}>
                  {goal.late ? ` · prazo era ${monthShort(goal.targetMonth)}` : ` até ${monthShort(goal.targetMonth)}`}
                </span>
              ) : null}
            </>
          )}
        </p>
      </div>
    );
  }

  if (item.account.purpose === "goal") {
    return <p className="mt-0.5 text-xs text-muted-foreground">Sem alvo definido. Edite para colocar valor e data.</p>;
  }

  if (reserve) {
    if (!reserve.cards.length) {
      return <p className="mt-0.5 text-xs text-muted-foreground">Nenhum cartão guarda a fatura aqui.</p>;
    }
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        Para o {reserve.cards.map((served) => served.name).join(" e ")} ·{" "}
        {reserve.neededCents === 0 ? (
          "nada a pagar agora"
        ) : reserve.missingCents > 0 ? (
          <span className="font-semibold text-warning">faltam {formatCents(reserve.missingCents)}</span>
        ) : (
          <span className="text-positive">cobre a fatura</span>
        )}
      </p>
    );
  }

  if (card) {
    const parts: React.ReactNode[] = [];
    if (card.nextPayment && card.nextPayment.state !== "open") {
      const overdue = card.nextPayment.state === "overdue";
      parts.push(
        <span key="due" className={cn(overdue && "font-semibold text-negative")}>
          {invoiceLabel(card.nextPayment.month, currentYear)} {overdue ? "venceu" : "vence"}{" "}
          {dayMonth(card.nextPayment.dueDate)}
        </span>,
      );
    } else if (card.openInvoice) {
      parts.push(
        `${invoiceLabel(card.openInvoice.month, currentYear)} fecha ${dayMonth(card.openInvoice.closingDate)}`,
      );
    }
    if (card.freeLimitCents !== null) {
      parts.push(
        card.freeLimitCents < 0 ? (
          <span key="limit" className="font-semibold text-negative">
            {formatCents(-card.freeLimitCents)} acima do limite
          </span>
        ) : (
          `${formatCents(card.freeLimitCents)} de limite livre`
        ),
      );
    }
    return (
      <p className="mt-0.5 text-xs text-muted-foreground">
        {parts.map((part, index) => (
          <span key={index}>
            {index > 0 ? " · " : null}
            {part}
          </span>
        ))}
      </p>
    );
  }

  return null;
}

function AccountMenu({ item, operatingId, currentYear, onEdit }: AccountRowProps) {
  const openNew = useEntryStore((state) => state.openNew);
  const confirm = useConfirm();
  const { pending, execute } = useAction();
  const { account, card, reserve, goal } = item;
  const payment = card?.nextPayment ?? null;
  const canDeposit = account.kind === "pocket" && operatingId !== null && operatingId !== account.id;
  const depositCents = reserve?.missingCents || (goal && !goal.reached ? goal.monthlyCents : null) || undefined;

  function payInvoice() {
    if (!payment) return;
    const title = `Pagar ${invoiceLabel(payment.month, currentYear).toLowerCase()}`;
    openNew({
      type: "transfer",
      accountId: account.card?.reserveAccountId ?? operatingId ?? undefined,
      toAccountId: account.id,
      amountCents: payment.remainingCents,
      invoiceMonth: payment.month,
      title,
    });
  }

  function deposit() {
    if (!operatingId) return;
    openNew({
      type: "transfer",
      accountId: operatingId,
      toAccountId: account.id,
      amountCents: depositCents,
      title: `Guardar em ${account.name}`,
    });
  }

  function archive(archived: boolean) {
    void execute(() => setAccountArchived({ id: account.id, archived }), {
      success: archived ? `${account.name} arquivada.` : `${account.name} voltou para a lista.`,
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir ${account.name}?`,
      description: "Só dá para excluir conta sem lançamentos. Se ela tem histórico, arquive.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) await execute(() => deleteAccount({ id: account.id }), { success: "Conta excluída." });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações de ${account.name}`}
            disabled={pending}
            className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {account.archived ? (
          <DropdownMenuItem onClick={() => archive(false)}>
            <ArchiveRestore />
            Desarquivar
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            {card ? (
              payment ? (
                <DropdownMenuItem onClick={payInvoice}>
                  <Receipt />
                  Pagar {invoiceLabel(payment.month, currentYear).toLowerCase()}
                </DropdownMenuItem>
              ) : null
            ) : (
              <DropdownMenuItem onClick={() => openNew({ type: "transfer", accountId: account.id })}>
                <ArrowUpRight />
                Transferir daqui
              </DropdownMenuItem>
            )}
            {canDeposit ? (
              <DropdownMenuItem onClick={deposit}>
                <PiggyBank />
                {depositCents ? `Guardar ${formatCents(depositCents)} aqui` : "Guardar aqui"}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => archive(true)}>
              <Archive />
              Arquivar
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
          <Trash2 />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
