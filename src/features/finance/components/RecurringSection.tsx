"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { RecurringRuleDialog } from "@/features/finance/components/dialogs/RecurringRuleDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type SavingsPot = { id: string; name: string };

type RecurringRule = {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  cadence: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
  allocationPercent: number;
  savingsPotId?: string;
};

const DAYS: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

function cadenceLabel(rule: RecurringRule) {
  if (rule.cadence === "weekly") return `Toda ${DAYS[rule.dayOfWeek ?? 0]}`;
  if (rule.cadence === "biweekly") return `Quinzenal (${DAYS[rule.dayOfWeek ?? 0]})`;
  if (rule.cadence === "yearly") return `Anual · dia ${rule.dayOfMonth ?? 1}`;
  if (rule.cadence === "custom") return "Intervalo customizado";
  return `Todo dia ${rule.dayOfMonth ?? 1}`;
}

function monthlyEstimate(rule: RecurringRule) {
  if (rule.cadence === "weekly") return rule.amount * 4.33;
  if (rule.cadence === "biweekly") return rule.amount * 2.17;
  if (rule.cadence === "yearly") return rule.amount / 12;
  return rule.amount;
}

export function RecurringSection() {
  const confirm = useConfirm();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [pots, setPots] = useState<SavingsPot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [rulesRes, potsRes] = await Promise.all([
        axios.get<{ data: RecurringRule[] }>("/api/finance/recurring-rules"),
        axios.get<{ data: SavingsPot[] }>("/api/finance/savings-pots"),
      ]);
      setRules(rulesRes.data.data);
      setPots(potsRes.data.data);
    } catch {
      toast.error("Não foi possível carregar recorrências.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void fetchAll();
    });
  }, [fetchAll]);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remover recorrência?",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/finance/recurring-rules/${id}`);
      toast.success("Recorrência removida.");
      void fetchAll();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  async function toggleActive(rule: RecurringRule) {
    try {
      await axios.patch(`/api/finance/recurring-rules/${rule.id}`, {
        isActive: !rule.isActive,
      });
      void fetchAll();
    } catch {
      toast.error("Erro ao atualizar.");
    }
  }

  const incomeRules = rules.filter((r) => r.type === "income");
  const expenseRules = rules.filter((r) => r.type === "expense");
  const monthlyIncome = incomeRules
    .filter((r) => r.isActive)
    .reduce((s, r) => s + monthlyEstimate(r), 0);
  const monthlyExpense = expenseRules
    .filter((r) => r.isActive)
    .reduce((s, r) => s + monthlyEstimate(r), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recorrências</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensal estimado:{" "}
            <span className="text-success font-medium">+{formatCurrency(monthlyIncome)}</span>
            {" · "}
            <span className="text-danger font-medium">−{formatCurrency(monthlyExpense)}</span>
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4" />
          Nova recorrência
        </Button>
      </div>

      <ContentReveal loading={loading} skeleton="row" count={3}>
        {rules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhuma recorrência"
          description="Configure entradas e saídas fixas para projeções automáticas."
          actionLabel="Nova recorrência"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {[
            { label: "Entradas recorrentes", items: incomeRules },
            { label: "Saídas recorrentes", items: expenseRules },
          ].map(({ label, items }) =>
            items.length === 0 ? null : (
              <div key={label}>
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-paper-sm">
                  {items.map((rule, i) => (
                    <div
                      key={rule.id}
                      className={cn(
                        "group flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-surface-soft sm:flex-nowrap",
                        i > 0 && "border-t border-border",
                        !rule.isActive && "opacity-50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{rule.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {cadenceLabel(rule)} · {rule.category}
                          {rule.allocationPercent > 0
                            ? ` · ${rule.allocationPercent}% para cofrinho`
                            : ""}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-semibold",
                          rule.type === "income" ? "text-success" : "text-danger",
                        )}
                      >
                        {rule.type === "income" ? "+" : "−"}
                        {formatCurrency(rule.amount)}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={rule.isActive ? "secondary" : "outline"}
                          onClick={() => toggleActive(rule)}
                          className={cn(
                            "rounded-full text-xs",
                            rule.isActive && "text-success hover:text-success",
                          )}
                        >
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          onClick={() => { setEditing(rule); setDialogOpen(true); }}
                          className="rounded-xl"
                          aria-label="Editar recorrência"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          onClick={() => handleDelete(rule.id)}
                          className="rounded-xl hover:text-danger"
                          aria-label="Remover recorrência"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
      </ContentReveal>

      <RecurringRuleDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        rule={editing}
        pots={pots}
        onSaved={() => {
          setDialogOpen(false);
          void fetchAll();
        }}
      />
    </div>
  );
}
