"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { monthShort } from "@/features/finance/domain/labels";
import { sumCents } from "@/features/finance/domain/money";
import type { Category, MonthKey } from "@/features/finance/domain/types";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { useEntryStore } from "@/stores/entry-store";
import type { InstallmentPlan } from "./cardView";

type InstallmentPlansProps = {
  cardId: string;
  plans: InstallmentPlan[];
  categories: Category[];
  openMonth: MonthKey;
};

/** Compras parceladas com parcelas ainda por vir (da fatura aberta em diante). */
export function InstallmentPlans({ cardId, plans, categories, openMonth }: InstallmentPlansProps) {
  const openNew = useEntryStore((state) => state.openNew);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const remainingCents = sumCents(plans.map((plan) => plan.remainingCents));

  return (
    <Panel
      title="Parcelamentos ativos"
      description={
        plans.length ? (
          <>
            <Money cents={remainingCents} /> a pagar em {plans.length} {plans.length === 1 ? "compra" : "compras"}
          </>
        ) : undefined
      }
      padded={false}
    >
      {plans.length ? (
        <ul className="divide-y divide-border">
          {plans.map((plan) => {
            const category = plan.categoryId ? categoriesById.get(plan.categoryId) : undefined;
            const isLast = plan.endMonth === openMonth;
            const notStarted = plan.nextMonth > openMonth;
            return (
              <li key={plan.groupId}>
                <Link
                  href={`/transactions?group=${plan.groupId}&month=all`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <CategoryIcon
                    icon={category?.icon}
                    color={category?.color}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">
                          {plan.description}
                        </p>
                        {isLast ? <Pill tone="positive">Última</Pill> : null}
                      </div>
                      <span className="shrink-0 text-sm">
                        <Money
                          cents={plan.installmentCents}
                          className="font-semibold"
                        />
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </span>
                    </div>
                    <Meter value={((plan.nextIndex - 1) / plan.count) * 100} />
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {notStarted
                          ? `Próxima ${plan.nextIndex}/${plan.count} em ${monthShort(plan.nextMonth)}`
                          : `Parcela ${plan.nextIndex}/${plan.count}`}
                        {isLast ? null : ` · termina em ${monthShort(plan.endMonth)}`}
                      </span>
                      <span className="whitespace-nowrap">
                        falta{" "}
                        <Money
                          cents={plan.remainingCents}
                          className="font-semibold text-foreground"
                        />
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-5 text-sm text-muted-foreground">
          Nenhuma compra parcelada em aberto neste cartão.
        </p>
      )}

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          className="w-full"
          // Antiga ou nova, é a mesma compra: com a data real, as parcelas caem nas faturas certas.
          onClick={() => openNew({ type: "expense", accountId: cardId, installments: 2 })}
        >
          <Plus />
          Lançar compra parcelada
        </Button>
      </div>
    </Panel>
  );
}
