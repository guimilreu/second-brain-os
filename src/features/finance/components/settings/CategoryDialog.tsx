"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ColorSwatch, FormActions, FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/features/finance/components/accounts/fields";
import { CATEGORY_ICONS, CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { useAction } from "@/features/finance/components/shared/useAction";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Category, CategoryKind } from "@/features/finance/domain/types";
import { saveCategory } from "@/features/finance/server/actions";
import { cn } from "@/lib/utils";
import { centsToInput } from "@/lib/utils/format";

// Inclui as cores das categorias iniciais para a edição mostrar a cor atual selecionada.
const CATEGORY_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#64748b",
  "#78716c",
  "#94a3b8",
];

const ICON_NAMES = Object.keys(CATEGORY_ICONS);

type CategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  /** null = nova categoria do tipo `kind`. */
  category: Category | null;
  kind: CategoryKind;
};

export function CategoryDialog({ open, onClose, category, kind }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "tag");
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLORS[0]);
  const [limitText, setLimitText] = useState(category?.limitCents ? centsToInput(category.limitCents) : "");
  const { pending, execute } = useAction();
  const categoryKind = category?.kind ?? kind;
  const colors = CATEGORY_COLORS.includes(color) ? CATEGORY_COLORS : [color, ...CATEGORY_COLORS];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    const limitCents = categoryKind === "expense" && limitText.trim() ? parseMoneyInput(limitText) : null;
    if (categoryKind === "expense" && limitText.trim() && (limitCents === null || limitCents < 0)) {
      toast.error("Limite inválido.");
      return;
    }
    void execute(
      () =>
        saveCategory({
          id: category?.id,
          name: trimmed,
          kind: categoryKind,
          color,
          icon,
          limitCents: limitCents || null,
        }),
      { success: category ? "Categoria atualizada." : "Categoria criada.", onSuccess: onClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Editar categoria" : categoryKind === "expense" ? "Nova categoria de saída" : "Nova categoria de entrada"}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="flex items-center gap-3">
          <CategoryIcon icon={icon} color={color} size="lg" />
          <div className="min-w-0 flex-1">
            <FormField label="Nome">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={categoryKind === "expense" ? "Ex.: Pets" : "Ex.: Aluguel recebido"}
                maxLength={40}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Ícone">
          <div role="group" aria-label="Ícone" className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {ICON_NAMES.map((iconName) => {
              const active = iconName === icon;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  aria-pressed={active}
                  aria-label={iconName}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border transition-colors",
                    active ? "border-primary bg-accent" : "border-transparent hover:bg-muted",
                  )}
                >
                  <CategoryIcon icon={iconName} color={active ? color : "#94a3b8"} size="sm" />
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Cor">
          <ColorSwatch value={color} onChange={setColor} colors={colors} />
        </FormField>

        {categoryKind === "expense" ? (
          <FormField
            label="Limite por mês"
            hint="Opcional. O Mês mostra quanto falta e avisa quando o ritmo passar do esperado."
          >
            <MoneyInput value={limitText} onValueChange={setLimitText} placeholder="Sem limite" />
          </FormField>
        ) : null}

        <FormActions onCancel={onClose} isLoading={pending} submitLabel={category ? "Salvar" : "Criar categoria"} />
      </form>
    </Modal>
  );
}
