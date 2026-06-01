"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Briefcase,
  FolderKanban,
  Heart,
  Home,
  Rocket,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ColorSwatch, FormActions, FormField, Input, Textarea } from "@/components/ui/FormField";
import { cn } from "@/lib/utils/cn";

type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
};

type ProjectDialogProps = {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onSaved: () => void;
};

const PROJECT_ICONS: { id: string; label: string; Icon: LucideIcon }[] = [
  { id: "FolderKanban", label: "Kanban", Icon: FolderKanban },
  { id: "Briefcase", label: "Trabalho", Icon: Briefcase },
  { id: "Rocket", label: "Lançamento", Icon: Rocket },
  { id: "ShoppingBag", label: "Compras", Icon: ShoppingBag },
  { id: "Home", label: "Casa", Icon: Home },
  { id: "Heart", label: "Pessoal", Icon: Heart },
];

function makeInitial(project?: Project | null) {
  return project
    ? {
        name: project.name,
        description: project.description,
        color: project.color,
        icon: project.icon ?? "FolderKanban",
      }
    : { name: "", description: "", color: "#ffc100", icon: "FolderKanban" };
}

export function ProjectDialog({ open, onClose, project, onSaved }: ProjectDialogProps) {
  const [form, setForm] = useState(() => makeInitial(project));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir modal
    setForm(makeInitial(project ?? null));
  }, [open, project]);

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
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Editar projeto" : "Novo projeto"}
      description="Agrupe tarefas por side-hustle, trabalho ou área de vida"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome do projeto">
          <Input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ex: Freelance Design"
          />
        </FormField>
        <FormField label="Descrição (opcional)">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Contexto do projeto..."
          />
        </FormField>
        <FormField label="Ícone">
          <div className="flex flex-wrap gap-2">
            {PROJECT_ICONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => set("icon", id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  form.icon === id
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border text-muted-foreground hover:bg-surface-soft",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Cor do projeto">
          <ColorSwatch value={form.color} onChange={(c) => set("color", c)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
