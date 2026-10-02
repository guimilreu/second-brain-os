"use client";

import { useState } from "react";
import { ChevronDown, Tag } from "lucide-react";
import type { Category } from "@/features/finance/domain/types";
import { CATEGORY_ICONS, CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";

type CategoryPickerProps = {
  id: string;
  /** Mais usadas (atalhos). */
  top: Category[];
  /** Todas as escolhíveis para o tipo (grade do "Mais"). */
  all: Category[];
  selected: Category | null;
  onSelect: (categoryId: string | null) => void;
};

export function CategoryPicker({ id, top, all, selected, onSelect }: CategoryPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const chips = selected && !top.some((category) => category.id === selected.id) ? [selected, ...top] : top;

  function choose(categoryId: string) {
    // Tocar na categoria já escolhida tira a categoria.
    onSelect(selected?.id === categoryId ? null : categoryId);
    setExpanded(false);
  }

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="space-y-2"
    >
      <p
        id={`${id}-label`}
        className="text-[0.8125rem] font-semibold"
      >
        Categoria
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((category) => {
          const Icon = CATEGORY_ICONS[category.icon] ?? Tag;
          return (
            <Chip
              key={category.id}
              active={selected?.id === category.id}
              onClick={() => choose(category.id)}
            >
              <Icon
                className="size-3.5"
                style={{ color: category.color }}
                aria-hidden
              />
              {category.name}
            </Chip>
          );
        })}
        {all.length > top.length ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${id}-all`}
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-dashed border-border px-2.5 text-[0.8125rem] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {expanded ? "Menos" : "Mais"}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div
          id={`${id}-all`}
          className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border bg-foreground/[0.03] p-1.5 sm:grid-cols-4"
        >
          {all.map((category) => {
            const active = selected?.id === category.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => choose(category.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-center text-[0.6875rem] leading-tight font-semibold transition-colors",
                  active ? "bg-card text-foreground ring-1 ring-primary/50" : "text-muted-foreground hover:bg-card",
                )}
              >
                <CategoryIcon
                  icon={category.icon}
                  color={category.color}
                  size="sm"
                />
                <span className="line-clamp-2">{category.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
