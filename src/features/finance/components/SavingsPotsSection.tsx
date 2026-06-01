"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { SavingsPotDialog } from "@/features/finance/components/dialogs/SavingsPotDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
import { formatCurrency } from "@/lib/utils/format";

type SavingsPot = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  priority: number;
  bankAccountId?: string;
};

export function SavingsPotsSection() {
  const confirm = useConfirm();
  const [pots, setPots] = useState<SavingsPot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsPot | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await axios.get<{ data: SavingsPot[] }>("/api/finance/savings-pots");
      setPots(res.data.data);
    } catch {
      toast.error("Não foi possível carregar cofrinhos.");
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
      title: "Remover cofrinho?",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/finance/savings-pots/${id}`);
      toast.success("Cofrinho removido.");
      void fetch();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  const totalSaved = pots.reduce((s, p) => s + p.currentAmount, 0);
  const totalTarget = pots.reduce((s, p) => s + p.targetAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Cofrinhos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(totalSaved)} guardados de {formatCurrency(totalTarget)} em metas
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4" />
          Novo cofrinho
        </Button>
      </div>

      <ContentReveal
        loading={loading}
        skeleton="card"
        count={3}
        skeletonClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {pots.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum cofrinho ainda"
          description="Crie cofrinhos para reservar parte das suas entradas automaticamente."
          actionLabel="Novo cofrinho"
          onAction={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <StaggerList className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pots.map((pot) => {
            const progress =
              pot.targetAmount > 0
                ? Math.min((pot.currentAmount / pot.targetAmount) * 100, 100)
                : 0;

            return (
              <StaggerItem key={pot.id} className="paper-note interactive-card group relative rounded-3xl p-5">
                <div className="absolute right-4 top-4 flex gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => { setEditing(pot); setDialogOpen(true); }}
                    className="rounded-xl"
                    aria-label="Editar cofrinho"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => handleDelete(pot.id)}
                    className="rounded-xl hover:text-danger"
                    aria-label="Remover cofrinho"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div
                  className="inline-flex rounded-2xl p-3"
                  style={{ backgroundColor: `${pot.color}20` }}
                >
                  <PiggyBank className="h-5 w-5" style={{ color: pot.color }} />
                </div>
                <div className="mt-4">
                  <p className="font-semibold">{pot.name}</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: pot.color }}>
                      {formatCurrency(pot.currentAmount)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      de {formatCurrency(pot.targetAmount)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: pot.color }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-muted-foreground">
                    {Math.round(progress)}% concluído
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
      </ContentReveal>

      <SavingsPotDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        pot={editing}
        onSaved={() => {
          setDialogOpen(false);
          void fetch();
        }}
      />
    </div>
  );
}
