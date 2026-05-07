"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { RecurringRuleDialog } from "@/features/finance/components/dialogs/RecurringRuleDialog";
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

export function RecurringSection() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [pots, setPots] = useState<SavingsPot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);

  const fetchAll = useCallback(async () => {
    const [rulesRes, potsRes] = await Promise.all([
      axios.get<{ data: RecurringRule[] }>("/api/finance/recurring-rules"),
      axios.get<{ data: SavingsPot[] }>("/api/finance/savings-pots"),
    ]);
    setRules(rulesRes.data.data);
    setPots(potsRes.data.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta recorrência?")) return;
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
    .reduce((s, r) => s + (r.cadence === "weekly" ? r.amount * 4.33 : r.amount), 0);
  const monthlyExpense = expenseRules
    .filter((r) => r.isActive)
    .reduce((s, r) => s + (r.cadence === "weekly" ? r.amount * 4.33 : r.amount), 0);

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
        <button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nova recorrência
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-surface h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-surface flex flex-col items-center gap-4 rounded-[2rem] py-16 text-center">
          <div className="rounded-3xl bg-brand-soft p-4 text-brand">
            <CalendarClock className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma recorrência</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure entradas e saídas fixas para projeções automáticas.
            </p>
          </div>
        </div>
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
                <div className="glass-surface overflow-hidden rounded-[2rem]">
                  {items.map((rule, i) => (
                    <div
                      key={rule.id}
                      className={cn(
                        "group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-soft",
                        i > 0 && "border-t border-border",
                        !rule.isActive && "opacity-50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{rule.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {rule.cadence === "weekly"
                            ? `Toda ${DAYS[rule.dayOfWeek ?? 0]}`
                            : `Todo dia ${rule.dayOfMonth}`}{" "}
                          · {rule.category}
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
                        <button
                          onClick={() => toggleActive(rule)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition",
                            rule.isActive
                              ? "bg-emerald-500/10 text-success hover:bg-emerald-500/20"
                              : "bg-surface-soft text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {rule.isActive ? "Ativa" : "Inativa"}
                        </button>
                        <button
                          onClick={() => { setEditing(rule); setDialogOpen(true); }}
                          className="rounded-xl bg-surface-soft p-2 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="rounded-xl bg-surface-soft p-2 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

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
