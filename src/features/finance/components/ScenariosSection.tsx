"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/FormField";
import { formatCurrency } from "@/lib/utils/format";

type ScenarioPlan = { id: string; name: string; horizonMonths: number; updatedAt?: string };
type SimPoint = {
  monthKey: string;
  baselineFreeToSpend: number;
  scenarioFreeToSpend: number;
};

export function ScenariosSection() {
  const [plans, setPlans] = useState<ScenarioPlan[]>([]);
  const [name, setName] = useState("Plano B");
  const [extraExpense, setExtraExpense] = useState("500");
  const [months, setMonths] = useState("12");
  const [projection, setProjection] = useState<SimPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await axios.get<{ data: ScenarioPlan[] }>("/api/finance/scenarios");
      setPlans(res.data.data);
    } catch {
      toast.error("Não foi possível carregar os cenários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function simulate(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(extraExpense);
    if (!name.trim() || Number.isNaN(amt) || amt <= 0) {
      toast.error("Preencha nome e valor da despesa extra (maior que zero).");
      return;
    }
    try {
      const res = await axios.post<{ data: { projection: SimPoint[] } }>(
        "/api/finance/scenarios",
        {
          name: name.trim(),
          horizonMonths: Math.min(60, Math.max(1, Number(months) || 12)),
          assumptions: [
            {
              kind: "add-expense",
              payload: {
                title: "Despesa extra (cenário)",
                amount: amt,
                category: "Outro",
              },
            },
          ],
        },
      );
      setProjection(res.data.data.projection);
      toast.success("Cenário simulado.");
      void load();
    } catch {
      toast.error("Não foi possível simular.");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(ev) => void simulate(ev)}
        className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Cenários
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Simular impacto mensal</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Simule o impacto de uma <strong>despesa recorrente mensal extra</strong> no
          &quot;livre para gastar&quot; dos próximos meses (base: suas recorrências atuais).
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <FormField label="Nome do cenário">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Despesa extra / mês (R$)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={extraExpense}
              onChange={(e) => setExtraExpense(e.target.value)}
            />
          </FormField>
          <FormField label="Horizonte (meses)">
            <Input
              type="number"
              min={1}
              max={60}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
          </FormField>
        </div>
        <Button type="submit" className="mt-4 rounded-2xl">
          Simular e salvar plano
        </Button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {projection?.length ? (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-sm font-semibold">Primeiros meses</p>
          <div className="mt-3 max-h-64 overflow-auto space-y-2">
            {projection.slice(0, 8).map((row) => (
              <div
                key={row.monthKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{row.monthKey}</span>
                <span className="text-muted-foreground">
                  base {formatCurrency(row.baselineFreeToSpend)} → cenário{" "}
                  {formatCurrency(row.scenarioFreeToSpend)}
                </span>
              </div>
            ))}
          </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-sm font-semibold">Planos salvos</p>
          {plans.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {plans.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 rounded-xl bg-surface-soft px-3 py-2">
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{p.horizonMonths} meses</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum cenário salvo ainda. Simule um plano para guardar histórico.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
