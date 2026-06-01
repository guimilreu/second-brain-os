"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { FormActions } from "@/components/ui/FormField";

type Category = {
  id: string;
  name: string;
  slug: string;
  kind: "income" | "expense" | "both";
  color: string;
  displayOrder: number;
};

const KIND_LABEL: Record<string, string> = {
  income: "Entrada",
  expense: "Saída",
  both: "Ambos",
};

export function CategoriesSection() {
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Category["kind"]>("expense");
  const [color, setColor] = useState("#94a3b8");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ data: Category[] }>("/api/finance/categories");
      setCategories(res.data.data);
    } catch {
      toast.error("Não foi possível carregar categorias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setKind("expense");
    setColor("#94a3b8");
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setKind(cat.kind);
    setColor(cat.color);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`/api/finance/categories/${editing.id}`, {
          name: name.trim(),
          kind,
          color,
        });
        toast.success("Categoria atualizada.");
      } else {
        await axios.post("/api/finance/categories", {
          name: name.trim(),
          kind,
          color,
        });
        toast.success("Categoria criada.");
      }
      setDialogOpen(false);
      void load();
    } catch {
      toast.error("Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Arquivar categoria?",
      description: "Ela deixa de aparecer nas listas, mas transações antigas permanecem.",
      destructive: true,
      confirmLabel: "Arquivar",
    });
    if (!ok) return;
    try {
      await axios.delete(`/api/finance/categories/${id}`);
      toast.success("Categoria arquivada.");
      void load();
    } catch {
      toast.error("Erro ao arquivar.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Categorias
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Organize seus lançamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie categorias personalizadas além do seed inicial.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl">
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      <ContentReveal
        loading={loading}
        skeleton="row"
        count={3}
        skeletonClassName="grid gap-3 md:grid-cols-2"
      >
        {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria customizada"
          description="As categorias padrão continuam disponíveis nos formulários."
        />
      ) : (
        <StaggerList className="grid gap-3 md:grid-cols-2">
          {categories.map((cat) => (
            <StaggerItem
              key={cat.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-paper-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{KIND_LABEL[cat.kind] ?? cat.kind}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => openEdit(cat)}
                  className="rounded-xl"
                  aria-label="Editar categoria"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => void handleDelete(cat.id)}
                  className="rounded-xl hover:text-danger"
                  aria-label="Arquivar categoria"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
      </ContentReveal>

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nome">
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pets, Viagem..."
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo">
              <Select value={kind} onChange={(e) => setKind(e.target.value as Category["kind"])}>
                <option value="expense">Saída</option>
                <option value="income">Entrada</option>
                <option value="both">Ambos</option>
              </Select>
            </FormField>
            <FormField label="Cor">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </FormField>
          </div>
          <FormActions
            onCancel={() => setDialogOpen(false)}
            isLoading={saving}
            submitLabel={editing ? "Salvar" : "Criar"}
          />
        </form>
      </Modal>
    </div>
  );
}
