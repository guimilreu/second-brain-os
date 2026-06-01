"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { ChevronDown, PiggyBank, ShoppingBag, StickyNote, Target } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EntityChip } from "@/components/ui/EntityChip";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Project = { id: string; name: string; color: string };

type LinkOption = { id: string; label: string };

type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  projectId?: string | { id?: string; _id?: string; name?: string };
  sprintId?: string;
  plannedFor?: string;
  estimatedCost?: number;
  relatedWishlistItemId?: string;
  relatedGoalId?: string;
  relatedSavingsPotId?: string;
  relatedNoteId?: string;
};

type TaskDialogProps = {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  projects: Project[];
  sprintId?: string;
  onSaved: () => void;
};

function extractId(value?: string | { id?: string; _id?: string }): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id?.toString() ?? value.id ?? "";
}

function makeInitial(task?: Task | null) {
  if (task) {
    return {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: extractId(task.projectId),
      plannedFor: task.plannedFor ? format(new Date(task.plannedFor), "yyyy-MM-dd") : "",
      estimatedCost: task.estimatedCost != null ? String(task.estimatedCost) : "",
      relatedWishlistItemId: task.relatedWishlistItemId ?? "",
      relatedGoalId: task.relatedGoalId ?? "",
      relatedSavingsPotId: task.relatedSavingsPotId ?? "",
      relatedNoteId: task.relatedNoteId ?? "",
    };
  }
  return {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    projectId: "",
    plannedFor: "",
    estimatedCost: "",
    relatedWishlistItemId: "",
    relatedGoalId: "",
    relatedSavingsPotId: "",
    relatedNoteId: "",
  };
}

export function TaskDialog({ open, onClose, task, projects, sprintId, onSaved }: TaskDialogProps) {
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState(() => makeInitial(task));
  const [showDetails, setShowDetails] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [linkOptions, setLinkOptions] = useState<{
    wishlist: LinkOption[];
    goals: LinkOption[];
    pots: LinkOption[];
    notes: LinkOption[];
  }>({ wishlist: [], goals: [], pots: [], notes: [] });

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir modal
    setForm(makeInitial(task ?? null));
    setShowDetails(Boolean(task?.id));
  }, [open, task]);

  useEffect(() => {
    if (!open || !isEdit) return;
    void (async () => {
      try {
        const [wishlistRes, goalsRes, potsRes, notesRes] = await Promise.all([
          axios.get<{ data: { id: string; title: string }[] }>("/api/wishlist/items"),
          axios.get<{ data: { id: string; name: string }[] }>("/api/finance/goals"),
          axios.get<{ data: { id: string; name: string }[] }>("/api/finance/savings-pots"),
          axios.get<{ data: { id: string; title: string }[] }>("/api/notes"),
        ]);
        setLinkOptions({
          wishlist: wishlistRes.data.data.map((item) => ({
            id: item.id,
            label: item.title,
          })),
          goals: goalsRes.data.data.map((goal) => ({
            id: goal.id,
            label: goal.name,
          })),
          pots: potsRes.data.data.map((pot) => ({
            id: pot.id,
            label: pot.name,
          })),
          notes: notesRes.data.data.map((note) => ({
            id: note.id,
            label: note.title,
          })),
        });
      } catch {
        /* optional link lists */
      }
    })();
  }, [open, isEdit]);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        projectId: form.projectId || undefined,
        plannedFor: form.plannedFor ? new Date(form.plannedFor).toISOString() : undefined,
        ...(isEdit
          ? {
              estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
              relatedWishlistItemId: form.relatedWishlistItemId || undefined,
              relatedGoalId: form.relatedGoalId || undefined,
              relatedSavingsPotId: form.relatedSavingsPotId || undefined,
              relatedNoteId: form.relatedNoteId || undefined,
            }
          : {}),
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
    <Modal open={open} onClose={onClose} title={task ? "Editar tarefa" : "Nova tarefa"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título">
          <Input
            required
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="O que precisa ser feito?"
          />
        </FormField>

        {projects.length > 0 ? (
          <FormField label="Projeto (opcional)">
            <Select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}

        {!isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between rounded-xl"
            onClick={() => setShowDetails((v) => !v)}
          >
            Mais detalhes
            <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
          </Button>
        ) : null}

        {(showDetails || isEdit) && (
          <>
            <FormField label="Descrição (opcional)">
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
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
              <FormField label="Planejada para" className="sm:col-span-2">
                <Input
                  type="date"
                  value={form.plannedFor}
                  onChange={(e) => set("plannedFor", e.target.value)}
                />
              </FormField>
            </div>
          </>
        )}

        {isEdit ? (
          <div className="space-y-4 border-t border-border/70 pt-4">
            <p className="text-sm font-medium text-muted-foreground">Vínculos e custo</p>
            {(form.relatedWishlistItemId ||
              form.relatedGoalId ||
              form.relatedSavingsPotId ||
              form.relatedNoteId) && (
              <div className="flex flex-wrap gap-2">
                {form.relatedWishlistItemId ? (
                  <EntityChip
                    href="/wishlist"
                    label={
                      linkOptions.wishlist.find((item) => item.id === form.relatedWishlistItemId)
                        ?.label ?? "Wishlist"
                    }
                    icon={<ShoppingBag className="h-3 w-3" />}
                  />
                ) : null}
                {form.relatedGoalId ? (
                  <EntityChip
                    href="/finance?tab=mais"
                    label={
                      linkOptions.goals.find((goal) => goal.id === form.relatedGoalId)?.label ??
                      "Meta"
                    }
                    icon={<Target className="h-3 w-3" />}
                  />
                ) : null}
                {form.relatedSavingsPotId ? (
                  <EntityChip
                    href="/finance?tab=mais"
                    label={
                      linkOptions.pots.find((pot) => pot.id === form.relatedSavingsPotId)?.label ??
                      "Cofrinho"
                    }
                    icon={<PiggyBank className="h-3 w-3" />}
                  />
                ) : null}
                {form.relatedNoteId ? (
                  <EntityChip
                    href="/notes"
                    label={
                      linkOptions.notes.find((note) => note.id === form.relatedNoteId)?.label ??
                      "Nota"
                    }
                    icon={<StickyNote className="h-3 w-3" />}
                  />
                ) : null}
              </div>
            )}
            <FormField label="Custo estimado (R$)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.estimatedCost}
                onChange={(e) => set("estimatedCost", e.target.value)}
                placeholder="0,00"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Item da wishlist">
                <Select
                  value={form.relatedWishlistItemId}
                  onChange={(e) => set("relatedWishlistItemId", e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {linkOptions.wishlist.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Meta financeira">
                <Select
                  value={form.relatedGoalId}
                  onChange={(e) => set("relatedGoalId", e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {linkOptions.goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Cofrinho">
                <Select
                  value={form.relatedSavingsPotId}
                  onChange={(e) => set("relatedSavingsPotId", e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {linkOptions.pots.map((pot) => (
                    <option key={pot.id} value={pot.id}>
                      {pot.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Nota">
                <Select
                  value={form.relatedNoteId}
                  onChange={(e) => set("relatedNoteId", e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {linkOptions.notes.map((note) => (
                    <option key={note.id} value={note.id}>
                      {note.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        ) : null}

        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
