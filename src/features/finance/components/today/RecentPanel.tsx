"use client";

import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import { TransactionMenu } from "@/features/finance/components/shared/TransactionMenu";
import { TransactionRow } from "@/features/finance/components/shared/TransactionRow";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { useEntryStore } from "@/stores/entry-store";
import type { TransactionView } from "./todayView";

export function RecentPanel({ rows }: { rows: TransactionView[] }) {
  const openEdit = useEntryStore((state) => state.openEdit);
  const openNew = useEntryStore((state) => state.openNew);

  return (
    <Panel
      title="Últimos lançamentos"
      actions={
        rows.length ? (
          <Link
            href="/transactions"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-my-1 -mr-2.5")}
          >
            Ver todos
            <ArrowRight />
          </Link>
        ) : null
      }
      padded={false}
    >
      {rows.length ? (
        <div className="divide-y divide-border py-1">
          {rows.map(({ transaction, category, account, toAccount }) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              category={category}
              account={account}
              toAccount={toAccount}
              showDate
              showInvoice
              onClick={() => openEdit(transaction)}
              actions={<TransactionMenu transaction={transaction} />}
            />
          ))}
        </div>
      ) : (
        <div className="p-5">
          <EmptyState
            icon={ReceiptText}
            title="Nenhum lançamento ainda"
            description="Lance o primeiro gasto: descrição, valor e conta, em poucos segundos."
            actionLabel="Lançar"
            onAction={() => openNew()}
          />
        </div>
      )}
    </Panel>
  );
}
