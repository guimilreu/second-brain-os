"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { monthlyNeed } from "@/features/finance/lib/goalFunding";
import { GoalDialog } from "@/features/finance/components/dialogs/GoalDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
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
  const confirm = useConfirm();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await axios.get<{ data: Goal[] }>("/api/finance/goals");
      setGoals(res.data.data);
    } catch {
      toast.error("Não foi possível carregar metas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void fetch();
    });
  }, [fetch]);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remover meta?",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!ok) return;
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
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4" />
          Nova meta
        </Button>
      </div>

      <ContentReveal
        loading={loading}
        skeleton="card"
        count={2}
        skeletonClassName="grid gap-4 md:grid-cols-2"
      >
        {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Defina objetivos financeiros e acompanhe seu progresso."
          actionLabel="Nova meta"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <StaggerList className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const progress =
              goal.targetAmount > 0
                ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                : 0;

            return (
              <StaggerItem key={goal.id} className="paper-note interactive-card group relative rounded-3xl p-6">
                <div className="absolute right-4 top-4 flex gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => { setEditing(goal); setDialogOpen(true); }}
                    className="rounded-xl"
                    aria-label="Editar meta"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => handleDelete(goal.id)}
                    className="rounded-xl hover:text-danger"
                    aria-label="Remover meta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
                    <span className="flex flex-col items-end gap-0.5">
                      {goal.dueDate ? (
                        <span>
                          Prazo: {format(new Date(goal.dueDate), "dd MMM yyyy", { locale: ptBR })}
                        </span>
                      ) : null}
                      {(() => {
                        const need = monthlyNeed({
                          targetAmount: goal.targetAmount,
                          currentAmount: goal.currentAmount,
                          dueDate: goal.dueDate,
                          status: goal.status,
                        });
                        if (need === null) return null;
                        return (
                          <span className="font-medium text-brand">
                            {formatCurrency(need)}/mês necessário
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
      </ContentReveal>

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
