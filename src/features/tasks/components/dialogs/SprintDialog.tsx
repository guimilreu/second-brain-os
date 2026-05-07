"use client";

import axios from "axios";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";

type Sprint = {
  id: string;
  title: string;
  intention: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type SprintDialogProps = {
  open: boolean;
  onClose: () => void;
  sprint: Sprint;
  onSaved: () => void;
};

function makeInitial(sprint: Sprint) {
  return {
    title: sprint.title,
    intention: sprint.intention,
    startsAt: format(new Date(sprint.startsAt), "yyyy-MM-dd"),
    endsAt: format(new Date(sprint.endsAt), "yyyy-MM-dd"),
    status: sprint.status,
  };
}

export function SprintDialog({ open, onClose, sprint, onSaved }: SprintDialogProps) {
  const [form, setForm] = useState(() => makeInitial(sprint));
  const [saving, setSaving] = useState(false);

  type FormKey = keyof ReturnType<typeof makeInitial>;

  function set(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      await axios.patch(`/api/tasks/sprints/${sprint.id}`, {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      });
      toast.success("Sprint atualizada.");
      onSaved();
    } catch {
      toast.error("Erro ao atualizar sprint.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar sprint semanal"
      description="Ajuste o plano da semana sem voltar para o caderno."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título">
          <Input
            required
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Ex: Sprint da semana"
          />
        </FormField>
        <FormField label="Intenção da semana">
          <Textarea
            rows={3}
            value={form.intention}
            onChange={(event) => set("intention", event.target.value)}
            placeholder="Qual é o foco real desta semana?"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Início">
            <Input
              type="date"
              required
              value={form.startsAt}
              onChange={(event) => set("startsAt", event.target.value)}
            />
          </FormField>
          <FormField label="Fim">
            <Input
              type="date"
              required
              value={form.endsAt}
              onChange={(event) => set("endsAt", event.target.value)}
            />
          </FormField>
          <FormField label="Status" className="sm:col-span-2">
            <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
              <option value="planned">Planejada</option>
              <option value="active">Ativa</option>
              <option value="completed">Concluída</option>
            </Select>
          </FormField>
        </div>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
