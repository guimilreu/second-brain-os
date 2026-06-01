"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Pencil, PieChart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
import { FormField, Input } from "@/components/ui/FormField";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils/format";

type Row = {
  id?: string;
  category: string;
  planned: number;
  spent: number;
  remaining: number;
  projection: number;
};

export function BudgetsSection() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Row[]>([]);
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState("");
  const [planned, setPlanned] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlanned, setEditPlanned] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ data: { budgets: Row[] } }>(
        `/api/finance/budgets?monthKey=${monthKey}&usage=1`,
      );
      setRows(res.data.data.budgets ?? []);
    } catch {
      toast.error("Não foi possível carregar os orçamentos.");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function add() {
    const plannedAmount = Number(planned);
    if (!category.trim() || Number.isNaN(plannedAmount) || plannedAmount <= 0) {
      toast.error("Informe categoria e valor planejado.");
      return;
    }
    try {
      await axios.post("/api/finance/budgets", {
        monthKey,
        category: category.trim(),
        plannedAmount,
      });
      toast.success("Orçamento salvo.");
      setCategory("");
      setPlanned("");
      void load();
    } catch {
      toast.error("Erro ao salvar orçamento.");
    }
  }

  function startEdit(row: Row) {
    if (!row.id) return;
    setEditingId(row.id);
    setEditPlanned(String(row.planned));
  }

  async function saveEdit(row: Row) {
    if (!row.id) return;
    const plannedAmount = Number(editPlanned);
    if (Number.isNaN(plannedAmount) || plannedAmount < 0) {
      toast.error("Valor planejado inválido.");
      return;
    }
    try {
      await axios.patch(`/api/finance/budgets/${row.id}`, { plannedAmount });
      toast.success("Orçamento atualizado.");
      setEditingId(null);
      void load();
    } catch {
      toast.error("Erro ao atualizar orçamento.");
    }
  }

  async function remove(row: Row) {
    if (!row.id) return;
    const ok = await confirm({
      title: "Excluir orçamento?",
      description: `Remover o envelope de ${row.category} para ${monthKey}.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/finance/budgets/${row.id}`);
      toast.success("Orçamento removido.");
      void load();
    } catch {
      toast.error("Erro ao excluir orçamento.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-paper-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Orçamentos
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Envelope mensal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Planeje limites por categoria e acompanhe consumo real.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr_9rem_auto]">
            <FormField label="Mês">
              <Input
                type="month"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
              />
            </FormField>
            <FormField label="Categoria">
              <Input
                placeholder="Mercado"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </FormField>
            <FormField label="Planejado">
              <Input
                placeholder="R$"
                type="number"
                min={0}
                step="0.01"
                value={planned}
                onChange={(e) => setPlanned(e.target.value)}
              />
            </FormField>
            <Button
              type="button"
              onClick={() => {
                void add();
              }}
              className="self-end rounded-2xl"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <ContentReveal
        loading={loading}
        skeleton="compact"
        count={4}
        skeletonClassName="grid gap-3 md:grid-cols-2"
      >
        {rows.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum orçamento neste mês"
          description="Crie envelopes para categorias como mercado, lazer e moradia."
        />
      ) : (
        <StaggerList className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const pct = r.planned > 0 ? Math.min((r.spent / r.planned) * 100, 100) : 0;
            const projPct =
              r.planned > 0 ? Math.min((r.projection / r.planned) * 100, 150) : 0;
            const color =
              pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500";
            const projOver = r.planned > 0 && r.projection > r.planned;
            const isEditing = editingId === r.id;

            return (
              <StaggerItem key={r.id ?? r.category} className="rounded-2xl border border-border bg-card p-4 shadow-paper-sm">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{r.category}</p>
                    {isEditing ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editPlanned}
                          onChange={(e) => setEditPlanned(e.target.value)}
                          className="h-8 w-28"
                        />
                        <Button type="button" size="sm" className="h-8 rounded-xl" onClick={() => void saveEdit(r)}>
                          Salvar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-xl"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Restante {formatCurrency(r.remaining)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    {!isEditing ? (
                      <span className="text-right font-medium">
                        {formatCurrency(r.spent)} / {formatCurrency(r.planned)}
                      </span>
                    ) : null}
                    {r.id ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => startEdit(r)}
                          disabled={isEditing}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl text-danger hover:text-danger"
                          onClick={() => void remove(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
                  <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{Math.round(pct)}% usado</span>
                  <span className={projOver ? "font-medium text-danger" : "text-muted-foreground"}>
                    Projeção {formatCurrency(r.projection)}
                    {r.planned > 0 ? ` (${Math.round(projPct)}%)` : ""}
                  </span>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
      </ContentReveal>
    </div>
  );
}
