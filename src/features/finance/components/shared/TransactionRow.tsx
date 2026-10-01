import { ArrowRight, ArrowLeftRight } from "lucide-react";
import type { Account, Category, Transaction } from "@/features/finance/domain/types";
import { dayMonth, monthShort, METHOD_LABELS } from "@/features/finance/domain/labels";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { CategoryIcon } from "./CategoryIcon";
import { cn } from "@/lib/utils";

type TransactionRowProps = {
  transaction: Transaction;
  category?: Category | null;
  account?: Account | null;
  toAccount?: Account | null;
  /** Mostra a data (listas que não agrupam por dia). */
  showDate?: boolean;
  /** Mostra em qual fatura caiu (listas fora da tela do cartão). */
  showInvoice?: boolean;
  onClick?: () => void;
  /** Ações à direita (menu "…"). */
  actions?: React.ReactNode;
  className?: string;
};

/** Linha padrão de lançamento: ícone, descrição, contexto e valor com sinal. */
export function TransactionRow({
  transaction: tx,
  category,
  account,
  toAccount,
  showDate = false,
  showInvoice = false,
  onClick,
  actions,
  className,
}: TransactionRowProps) {
  const isTransfer = tx.type === "transfer";
  const signed = tx.type === "expense" ? -tx.amountCents : tx.type === "transfer" ? 0 : tx.amountCents;

  const meta: React.ReactNode[] = [];
  if (showDate) meta.push(dayMonth(tx.date));
  if (isTransfer) {
    meta.push(
      <span key="route" className="inline-flex items-center gap-1">
        {account?.name ?? "?"}
        <ArrowRight className="size-3" />
        {toAccount?.name ?? "?"}
      </span>,
    );
  } else {
    if (category) meta.push(category.name);
    if (account) meta.push(account.name);
    if (tx.method && tx.method !== "credit" && !account?.card) meta.push(METHOD_LABELS[tx.method]);
  }
  if (showInvoice && tx.invoiceMonth && !isTransfer) meta.push(`fatura ${monthShort(tx.invoiceMonth)}`);

  const content = (
    <>
      {isTransfer ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <ArrowLeftRight className="size-4" />
        </span>
      ) : (
        <CategoryIcon icon={category?.icon} color={category?.color} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{tx.description}</p>
          {tx.installment && tx.installment.count > 1 ? (
            <Pill tone="primary" className="num">
              {tx.installment.index}/{tx.installment.count}
            </Pill>
          ) : null}
          {tx.type === "refund" ? <Pill tone="positive">Estorno</Pill> : null}
          {tx.recurringId ? <Pill>Fixa</Pill> : null}
        </div>
        {meta.length ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
            {meta.map((item, index) => (
              <span key={index} className="inline-flex shrink-0 items-center gap-1 last:shrink">
                {index > 0 ? <span aria-hidden>·</span> : null}
                {item}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {isTransfer ? (
        <Money cents={tx.amountCents} className="text-sm font-semibold text-muted-foreground" />
      ) : (
        <Money cents={signed} signed className="text-sm font-semibold" />
      )}
    </>
  );

  return (
    <div className={cn("group flex items-center gap-3 px-4 py-2.5", className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
