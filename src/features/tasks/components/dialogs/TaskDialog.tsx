"use client";

import { useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";

type Project = { id: string; name: string; color: string };

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId?: string | { id?: string; _id?: string; name?: string };
  sprintId?: string;
  plannedFor?: string;
};

type TaskDialogProps = {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  projects: Project[];
  sprintId?: string;
  onSaved: () => void;
};

function extractProjectId(projectId: Task["projectId"]): string {
  if (!projectId) return "";
  if (typeof projectId === "string") return projectId;
  return projectId._id?.toString() ?? projectId.id ?? "";
}

function makeInitial(task?: Task | null) {
  if (task) {
    return {
      title: task.title, description: task.description,
      status: task.status, priority: task.priority,
      projectId: extractProjectId(task.projectId),
      plannedFor: task.plannedFor ? format(new Date(task.plannedFor), "yyyy-MM-dd") : "",
    };
  }
  return { title: "", description: "", status: "todo", priority: "medium", projectId: "", plannedFor: "" };
}

export function TaskDialog({ open, onClose, task, projects, sprintId, onSaved }: TaskDialogProps) {
  const [form, setForm] = useState(() => makeInitial(task));
  const [saving, setSaving] = useState(false);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title, description: form.description,
        status: form.status, priority: form.priority,
        projectId: form.projectId || undefined,
        plannedFor: form.plannedFor ? new Date(form.plannedFor).toISOString() : undefined,
      };
      if (task?.id) {
        await axios.patch(`/api/tasks/${task.id}`, payload);
        toast.success("Tarefa atualizada.");
      } else {
        await axios.post("/api/tasks", { ...payload, sprintId });
        toast.success("Tarefa criada.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={task ? "Editar tarefa" : "Nova tarefa"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título">
          <Input required autoFocus value={form.title}
            onChange={(e) => set("title", e.target.value)} placeholder="O que precisa ser feito?" />
        </FormField>
        <FormField label="Descrição (opcional)">
          <Textarea rows={3} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Contexto, links, detalhes..." />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="todo">A fazer</option>
              <option value="doing">Em execução</option>
              <option value="blocked">Bloqueada</option>
              <option value="done">Concluída</option>
            </Select>
          </FormField>
          <FormField label="Prioridade">
            <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </Select>
          </FormField>
          <FormField label="Projeto">
            <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Planejada para">
            <Input type="date" value={form.plannedFor}
              onChange={(e) => set("plannedFor", e.target.value)} />
          </FormField>
        </div>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
