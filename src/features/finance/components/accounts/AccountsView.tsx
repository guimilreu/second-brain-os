"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ListChecks, Plus, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Stat } from "@/components/ui/Stat";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import type { Account } from "@/features/finance/domain/types";
import { formatCents } from "@/lib/utils/format";
import { AccountDialog } from "./AccountDialog";
import { AccountRow } from "./AccountRow";
import type { AccountsOverview } from "./overview";
import { INSTITUTION_GROUP_LABELS } from "./presets";
import { ReconcileDialog } from "./ReconcileDialog";
import { YieldsDialog } from "./YieldsDialog";
import type { MonthKey } from "@/features/finance/domain/types";

type AccountsViewProps = {
  overview: AccountsOverview;
  /** Veio de /accounts?reconcile=1 (aviso "Confira os saldos"). */
  startReconciling: boolean;
  /** Veio de /accounts?yields=AAAA-MM (aviso de rendimento do mês). */
  startYields: MonthKey | null;
};

export function AccountsView({ overview, startReconciling, startYields }: AccountsViewProps) {
  const router = useRouter();
  const { groups, archived, stats, today } = overview;
  // `key` muda a cada abertura para o formulário nascer com os dados atuais.
  const [editor, setEditor] = useState<{ open: boolean; account: Account | null; key: number }>({
    open: false,
    account: null,
    key: 0,
  });
  const [reconcile, setReconcile] = useState({ open: startReconciling, key: 0 });
  const [yields, setYields] = useState({ open: Boolean(startYields), key: 0 });
  const [showArchived, setShowArchived] = useState(false);

  const currentYear = Number(today.slice(0, 4));
  const activeItems = groups.flatMap((group) => group.items);
  const moneyItems = activeItems.filter((item) => item.account.kind !== "credit_card");
  const yieldingItems = moneyItems.filter((item) => (item.account.yieldCdiPct ?? 0) > 0);
  const pockets = activeItems.filter((item) => item.account.kind === "pocket").map((item) => item.account);
  const editingBalance =
    [...activeItems, ...archived].find((item) => item.account.id === editor.account?.id)?.balanceCents ?? 0;

  function openEditor(account: Account | null) {
    setEditor((current) => ({ open: true, account, key: current.key + 1 }));
  }

  function openReconcile() {
    setReconcile((current) => ({ open: true, key: current.key + 1 }));
  }

  function closeReconcile() {
    setReconcile((current) => ({ ...current, open: false }));
    // Tira o ?reconcile=1 da URL para não reabrir ao voltar para a página.
    if (startReconciling) window.history.replaceState(null, "", "/accounts");
  }

  const header = (
    <PageHeader
      title="Contas e cofres"
      description="Onde está seu dinheiro, quanto rende e quanto já está guardado."
      actions={
        <>
          {yieldingItems.length ? (
            <Button variant="outline" onClick={() => setYields((current) => ({ open: true, key: current.key + 1 }))}>
              <TrendingUp />
              Registrar rendimentos
            </Button>
          ) : null}
          <Button variant="outline" onClick={openReconcile} disabled={!moneyItems.length}>
            <ListChecks />
            Conferir saldos
          </Button>
          <Button onClick={() => openEditor(null)}>
            <Plus />
            Nova conta
          </Button>
        </>
      }
    />
  );

  const dialogs = (
    <>
      <AccountDialog
        key={`account-${editor.key}`}
        open={editor.open}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
        account={editor.account}
        balanceCents={editingBalance}
        pockets={pockets}
        today={today}
      />
      <YieldsDialog
        key={`yields-${yields.key}`}
        open={yields.open && yieldingItems.length > 0}
        onClose={() => {
          setYields((current) => ({ ...current, open: false }));
          if (startYields) window.history.replaceState(null, "", "/accounts");
        }}
        items={yieldingItems}
        today={today}
        initialMonth={startYields}
        recorded={overview.yieldsRecorded}
      />
      <ReconcileDialog
        key={`reconcile-${reconcile.key}`}
        open={reconcile.open && moneyItems.length > 0}
        onClose={closeReconcile}
        items={moneyItems}
        today={today}
      />
    </>
  );

  if (!activeItems.length && !archived.length) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta ainda"
          description="A configuração inicial já monta Mercado Pago, cofres e cartão. Leva uns minutos."
          actionLabel="Fazer configuração inicial"
          onAction={() => router.push("/setup")}
        />
        {dialogs}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Patrimônio"
          value={<Money cents={stats.netWorthCents} compact />}
          tone={stats.netWorthCents < 0 ? "negative" : "default"}
          hint={
            stats.cardDebtCents > 0
              ? `Já descontando ${formatCents(stats.cardDebtCents)} do cartão`
              : "Contas e cofres, sem dívida no cartão"
          }
        />
        <Stat
          label="Disponível"
          value={<Money cents={stats.availableCents} compact />}
          hint="Dia a dia, contas e dinheiro"
        />
        <Stat
          label="Guardado"
          value={<Money cents={stats.savedCents} compact />}
          hint={
            stats.cardReserveCents > 0
              ? `${formatCents(stats.cardReserveCents)} para a fatura`
              : "Metas e reservas"
          }
        />
        <Stat
          label="Rendeu este mês"
          value={<Money cents={stats.yieldThisMonthCents} className="text-positive" />}
          hint={
            overview.cdiAnnualPct
              ? `Estimativa ${formatCents(stats.monthlyYieldCents)}/mês · 12 meses: ${formatCents(stats.yieldLast12Cents)}`
              : `12 meses: ${formatCents(stats.yieldLast12Cents)} · defina o CDI para estimar`
          }
        />
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <Panel
            key={group.institution}
            padded={false}
            title={
              <span className="flex items-center gap-2.5">
                <InstitutionMark
                  institution={group.institution}
                  name={INSTITUTION_GROUP_LABELS[group.institution]}
                  size="sm"
                />
                {INSTITUTION_GROUP_LABELS[group.institution]}
              </span>
            }
            actions={group.hasMoney ? <Money cents={group.totalCents} className="text-sm font-semibold" /> : null}
          >
            <ul className="divide-y divide-border">
              {group.items.map((item) => (
                <AccountRow
                  key={item.account.id}
                  item={item}
                  operatingId={overview.operatingId}
                  currentYear={currentYear}
                  onEdit={() => openEditor(item.account)}
                />
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      {archived.length ? (
        <section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((value) => !value)}
            aria-expanded={showArchived}
            className="-ml-2.5"
          >
            <ChevronDown className={showArchived ? "rotate-180 transition-transform" : "transition-transform"} />
            Arquivadas ({archived.length})
          </Button>
          {showArchived ? (
            <Panel padded={false} className="mt-2">
              <ul className="divide-y divide-border">
                {archived.map((item) => (
                  <AccountRow
                    key={item.account.id}
                    item={item}
                    operatingId={overview.operatingId}
                    currentYear={currentYear}
                    onEdit={() => openEditor(item.account)}
                  />
                ))}
              </ul>
            </Panel>
          ) : null}
        </section>
      ) : null}

      {dialogs}
    </div>
  );
}
