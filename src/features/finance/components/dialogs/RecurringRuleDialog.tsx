"use client";

import { useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";

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

type RecurringRuleDialogProps = {
  open: boolean;
  onClose: () => void;
  rule?: RecurringRule | null;
  pots: SavingsPot[];
  onSaved: () => void;
};

const CATEGORIES = [
  "Alimentação", "Moradia", "Transporte", "Saúde", "Educação",
  "Lazer", "Roupas", "Tecnologia", "Assinatura", "Freelance",
  "Salário", "Investimento", "Transferência", "Outro",
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" }, { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" }, { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" }, { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

function makeInitial(rule?: RecurringRule | null) {
  if (rule) {
    return {
      title: rule.title, amount: rule.amount, type: rule.type, category: rule.category,
      cadence: rule.cadence, dayOfWeek: rule.dayOfWeek ?? 5, dayOfMonth: rule.dayOfMonth ?? 10,
      startsAt: format(new Date(rule.startsAt), "yyyy-MM-dd"),
      endsAt: rule.endsAt ? format(new Date(rule.endsAt), "yyyy-MM-dd") : "",
      isActive: rule.isActive, allocationPercent: rule.allocationPercent,
      savingsPotId: rule.savingsPotId ?? "",
    };
  }
  return {
    title: "", amount: 0, type: "income", category: "Salário",
    cadence: "weekly", dayOfWeek: 5, dayOfMonth: 10,
    startsAt: format(new Date(), "yyyy-MM-dd"), endsAt: "",
    isActive: true, allocationPercent: 0, savingsPotId: "",
  };
}

export function RecurringRuleDialog({ open, onClose, rule, pots, onSaved }: RecurringRuleDialogProps) {
  const [form, setForm] = useState(() => makeInitial(rule));
  const [saving, setSaving] = useState(false);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title, amount: Number(form.amount), type: form.type,
        category: form.category, cadence: form.cadence,
        ...(form.cadence === "weekly" ? { dayOfWeek: form.dayOfWeek } : { dayOfMonth: form.dayOfMonth }),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        isActive: form.isActive, allocationPercent: Number(form.allocationPercent),
        savingsPotId: form.savingsPotId || undefined,
      };
      if (rule?.id) {
        await axios.patch(`/api/finance/recurring-rules/${rule.id}`, payload);
        toast.success("Regra atualizada.");
      } else {
        await axios.post("/api/finance/recurring-rules", payload);
        toast.success("Regra criada.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a regra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={rule ? "Editar recorrência" : "Nova recorrência"}
      description="Receitas e despesas que se repetem" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Descrição" className="sm:col-span-2">
            <Input required value={form.title}
              onChange={(e) => set("title", e.target.value)} placeholder="Ex: Salário semanal" />
          </FormField>
          <FormField label="Tipo">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </Select>
          </FormField>
          <FormField label="Valor (R$)">
            <Input required type="number" step="0.01" min="0.01" value={form.amount}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} />
          </FormField>
          <FormField label="Categoria">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Frequência">
            <Select value={form.cadence} onChange={(e) => set("cadence", e.target.value)}>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </Select>
          </FormField>
          {form.cadence === "weekly" ? (
            <FormField label="Dia da semana">
              <Select value={form.dayOfWeek} onChange={(e) => set("dayOfWeek", Number(e.target.value))}>
                {DAYS_OF_WEEK.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </FormField>
          ) : (
            <FormField label="Dia do mês">
              <Input type="number" min={1} max={31} value={form.dayOfMonth}
                onChange={(e) => set("dayOfMonth", Number(e.target.value))} />
            </FormField>
          )}
          <FormField label="Início">
            <Input type="date" required value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)} />
          </FormField>
          <FormField label="Fim (opcional)">
            <Input type="date" value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)} />
          </FormField>
        </div>

        {form.type === "income" ? (
          <div className="rounded-2xl border border-border bg-surface-soft p-4 space-y-4">
            <p className="text-sm font-medium">Alocação automática em cofrinho</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="% para guardar">
                <Input type="number" min={0} max={100} value={form.allocationPercent}
                  onChange={(e) => set("allocationPercent", Number(e.target.value))} />
              </FormField>
              {form.allocationPercent > 0 ? (
                <FormField label="Cofrinho de destino">
                  <Select value={form.savingsPotId}
                    onChange={(e) => set("savingsPotId", e.target.value)}>
                    <option value="">Selecione um cofrinho</option>
                    {pots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </FormField>
              ) : null}
            </div>
          </div>
        ) : null}

        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
