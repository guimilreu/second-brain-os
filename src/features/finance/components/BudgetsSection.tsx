"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { PieChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input } from "@/components/ui/FormField";
import { formatCurrency } from "@/lib/utils/format";

type Row = {
  category: string;
  planned: number;
  spent: number;
  remaining: number;
};

export function BudgetsSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [category, setCategory] = useState("");
  const [planned, setPlanned] = useState("");
  const [loading, setLoading] = useState(true);

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

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum orçamento neste mês"
          description="Crie envelopes para categorias como mercado, lazer e moradia."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => {
            const pct = r.planned > 0 ? Math.min((r.spent / r.planned) * 100, 100) : 0;
            const color =
              pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={r.category} className="rounded-2xl border border-border bg-card p-4 shadow-paper-sm">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{r.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Restante {formatCurrency(r.remaining)}
                    </p>
                  </div>
                  <span className="text-right font-medium">
                    {formatCurrency(r.spent)} / {formatCurrency(r.planned)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
                  <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  {Math.round(pct)}% usado
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
