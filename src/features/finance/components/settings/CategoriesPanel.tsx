"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Segmented } from "@/components/ui/Segmented";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { useAction } from "@/features/finance/components/shared/useAction";
import type { Category, CategoryKind } from "@/features/finance/domain/types";
import { setCategoryArchived } from "@/features/finance/server/actions";
import { cn } from "@/lib/utils";
import { CategoryDialog } from "./CategoryDialog";

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Saídas" },
  { value: "income", label: "Entradas" },
];

type CategoriesPanelProps = {
  categories: Category[];
  className?: string;
};

export function CategoriesPanel({ categories, className }: CategoriesPanelProps) {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [showArchived, setShowArchived] = useState(false);
  // `key` muda a cada abertura para o formulário nascer com os dados da categoria.
  const [editor, setEditor] = useState<{ open: boolean; category: Category | null; key: number }>({
    open: false,
    category: null,
    key: 0,
  });
  const { pending, execute } = useAction();

  const ofKind = categories.filter((category) => category.kind === kind);
  // Categorias do sistema vão para o fim: não são editáveis e quase nunca interessam aqui.
  const active = ofKind
    .filter((category) => !category.archived)
    .sort((a, b) => Number(Boolean(a.systemKey)) - Number(Boolean(b.systemKey)));
  const archived = ofKind.filter((category) => category.archived);

  function openEditor(category: Category | null) {
    setEditor((current) => ({ open: true, category, key: current.key + 1 }));
  }

  function setArchived(category: Category, value: boolean) {
    void execute(() => setCategoryArchived({ id: category.id, archived: value }), {
      success: value ? `${category.name} arquivada.` : `${category.name} voltou para a lista.`,
    });
  }

  return (
    <Panel
      title="Categorias"
      description="Limite por mês é opcional: o Mês e os avisos usam."
      actions={
        <Button size="sm" onClick={() => openEditor(null)}>
          <Plus />
          Nova
        </Button>
      }
      padded={false}
      className={className}
    >
      <div className="border-b border-border px-4 py-3">
        <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} size="sm" />
      </div>

      {active.length ? (
        <ul className="divide-y divide-border">
          {active.map((category) => {
            const content = (
              <>
                <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{category.name}</span>
                    {category.systemKey ? <Pill>Sistema</Pill> : null}
                  </span>
                </span>
                {kind === "expense" && !category.systemKey ? (
                  category.limitCents ? (
                    <span className="shrink-0 text-right text-[0.8125rem] font-semibold">
                      <Money cents={category.limitCents} compact />
                      <span className="font-normal text-muted-foreground">/mês</span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Sem limite</span>
                  )
                ) : null}
              </>
            );
            return (
              <li key={category.id} className="group flex items-center gap-2 px-4 py-2.5">
                {category.systemKey ? (
                  <div className="flex min-w-0 flex-1 items-center gap-3 py-1">{content}</div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditor(category)}
                      className="-mx-2 -my-1 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
                    >
                      {content}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Arquivar ${category.name}`}
                      title="Arquivar"
                      disabled={pending}
                      onClick={() => setArchived(category, true)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Archive />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="p-4">
          <EmptyState
            icon={Tags}
            title={kind === "expense" ? "Nenhuma categoria de saída" : "Nenhuma categoria de entrada"}
            actionLabel="Criar categoria"
            onAction={() => openEditor(null)}
          />
        </div>
      )}

      {archived.length ? (
        <div className="border-t border-border px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((value) => !value)}
            aria-expanded={showArchived}
          >
            <ChevronDown className={cn("transition-transform", showArchived && "rotate-180")} />
            Arquivadas ({archived.length})
          </Button>
          {showArchived ? (
            <ul className="mt-1 divide-y divide-border">
              {archived.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-2 py-2.5">
                  <CategoryIcon icon={category.icon} color={category.color} size="sm" className="opacity-60" />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{category.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setArchived(category, false)}
                  >
                    <ArchiveRestore />
                    Desarquivar
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <CategoryDialog
        key={editor.key}
        open={editor.open}
        onClose={() => setEditor((current) => ({ ...current, open: false }))}
        category={editor.category}
        kind={kind}
      />
    </Panel>
  );
}
