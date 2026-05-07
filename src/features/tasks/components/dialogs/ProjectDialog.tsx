"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { ColorSwatch, FormActions, FormField, Input, Textarea } from "@/components/ui/FormField";

type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
};

type ProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onSaved: () => void;
};

function makeInitial(project?: Project | null) {
  return project
    ? { name: project.name, description: project.description, color: project.color }
    : { name: "", description: "", color: "#ffc100" };
}

export function ProjectDialog({ open, onClose, project, onSaved }: ProjectDialogProps) {
  const [form, setForm] = useState(() => makeInitial(project));
  const [saving, setSaving] = useState(false);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (project?.id) {
        await axios.patch(`/api/tasks/projects/${project.id}`, form);
        toast.success("Projeto atualizado.");
      } else {
        await axios.post("/api/tasks/projects", form);
        toast.success("Projeto criado.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar o projeto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={project ? "Editar projeto" : "Novo projeto"}
      description="Agrupe tarefas por side-hustle, trabalho ou área de vida">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome do projeto">
          <Input required value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="Ex: Freelance Design" />
        </FormField>
        <FormField label="Descrição (opcional)">
          <Textarea rows={2} value={form.description}
            onChange={(e) => set("description", e.target.value)} placeholder="Contexto do projeto..." />
        </FormField>
        <FormField label="Cor do projeto">
          <ColorSwatch value={form.color} onChange={(c) => set("color", c)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
