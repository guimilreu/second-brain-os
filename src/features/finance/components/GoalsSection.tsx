"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { GoalDialog } from "@/features/finance/components/dialogs/GoalDialog";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Goal = {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-success",
  paused: "bg-amber-500/10 text-warning",
  completed: "bg-brand-soft text-brand",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
};

export function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const fetch = useCallback(async () => {
    const res = await axios.get<{ data: Goal[] }>("/api/finance/goals");
    setGoals(res.data.data);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetch(); }, [fetch]);

  async function handleDelete(id: string) {
    if (!confirm("Remover esta meta?")) return;
    try {
      await axios.delete(`/api/finance/goals/${id}`);
      toast.success("Meta removida.");
      void fetch();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Metas financeiras</h2>
          <p className="mt-1 text-sm text-muted-foreground">{goals.length} meta{goals.length !== 1 ? "s" : ""} cadastrada{goals.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="glass-surface h-44 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="glass-surface flex flex-col items-center gap-4 rounded-[2rem] py-16 text-center">
          <div className="rounded-3xl bg-brand-soft p-4 text-brand">
            <Target className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma meta cadastrada</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina objetivos financeiros e acompanhe seu progresso.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const progress =
              goal.targetAmount > 0
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0;

            return (
              <div key={goal.id} className="glass-surface group relative rounded-[2rem] p-6">
                <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => { setEditing(goal); setDialogOpen(true); }}
                    className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="rounded-xl bg-surface-soft p-2 text-muted-foreground transition hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-brand-soft p-3 text-brand">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{goal.name}</h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS[goal.status] ?? "bg-surface-soft text-muted-foreground",
                        )}
                      >
                        {STATUS_LABELS[goal.status] ?? goal.status}
                      </span>
                    </div>
                    {goal.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-soft">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{Math.round(progress)}% concluído</span>
                    {goal.dueDate ? (
                      <span>
                        Prazo: {format(new Date(goal.dueDate), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        goal={editing}
        onSaved={() => {
          setDialogOpen(false);
          void fetch();
        }}
      />
    </div>
  );
}
