"use client";

import { useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";

type Goal = {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string;
  status: string;
};

type GoalDialogProps = {
  open: boolean;
  onClose: () => void;
  goal?: Goal | null;
  onSaved: () => void;
};

function makeInitial(goal?: Goal | null) {
  return goal
    ? {
        name: goal.name, description: goal.description,
        targetAmount: goal.targetAmount, currentAmount: goal.currentAmount,
        dueDate: goal.dueDate ? format(new Date(goal.dueDate), "yyyy-MM-dd") : "",
        status: goal.status,
      }
    : { name: "", description: "", targetAmount: 0, currentAmount: 0, dueDate: "", status: "active" };
}

export function GoalDialog({ open, onClose, goal, onSaved }: GoalDialogProps) {
  const [form, setForm] = useState(() => makeInitial(goal));
  const [saving, setSaving] = useState(false);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetAmount: Number(form.targetAmount),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      if (goal?.id) {
        await axios.patch(`/api/finance/goals/${goal.id}`, payload);
        toast.success("Meta atualizada.");
      } else {
        await axios.post("/api/finance/goals", payload);
        toast.success("Meta criada.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a meta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={goal ? "Editar meta" : "Nova meta financeira"}
      description="Objetivos de médio e longo prazo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome da meta">
          <Input required value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="Ex: Comprar um notebook" />
        </FormField>
        <FormField label="Descrição (opcional)">
          <Textarea rows={2} value={form.description}
            onChange={(e) => set("description", e.target.value)} placeholder="Contexto ou motivação..." />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Valor necessário (R$)">
            <Input required type="number" step="0.01" min="0" value={form.targetAmount}
              onChange={(e) => set("targetAmount", parseFloat(e.target.value) || 0)} />
          </FormField>
          <FormField label="Já guardado (R$)">
            <Input type="number" step="0.01" min="0" value={form.currentAmount}
              onChange={(e) => set("currentAmount", parseFloat(e.target.value) || 0)} />
          </FormField>
          <FormField label="Prazo (opcional)">
            <Input type="date" value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluída</option>
            </Select>
          </FormField>
        </div>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
