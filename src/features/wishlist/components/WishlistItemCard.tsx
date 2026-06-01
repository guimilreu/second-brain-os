"use client";

import axios from "axios";
import {
  CalendarPlus,
  ExternalLink,
  GripVertical,
  ListTodo,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EntityChip } from "@/components/ui/EntityChip";
import {
  suggestBestMonth,
  type AffordabilityLevel,
  type SuggestBestMonthOptions,
} from "@/features/wishlist/lib/aggregation";
import type { WishlistOverviewItem } from "@/features/wishlist/lib/types";
import { cn } from "@/lib/utils/cn";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABEL: Record<string, string> = {
  idea: "Ideia",
  researching: "Pesquisando",
  ready: "Pronto",
  purchased: "Comprado",
  cancelled: "Cancelado",
};

const AFFORDABILITY_LABEL: Record<AffordabilityLevel, string> = {
  comfortable: "Cabe bem",
  tight: "Apertado",
  over: "Acima do livre",
};

const AFFORDABILITY_STYLE: Record<AffordabilityLevel, string> = {
  comfortable: "bg-success/10 text-success border-transparent",
  tight: "bg-warning/10 text-warning border-transparent",
  over: "bg-danger/10 text-danger border-transparent",
};

type WishlistItemCardProps = {
  item: WishlistOverviewItem;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  isDragging?: boolean;
  monthOverCap?: boolean;
  affordability?: AffordabilityLevel | null;
  suggestOptions?: SuggestBestMonthOptions;
  savingsPotName?: string;
  goalName?: string;
  onEdit: () => void;
  onLinkPot?: () => void;
  onReservePot?: () => void;
  onCreateTask?: () => void;
};

function patienceBadge(createdAt?: string) {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  const days = (Date.now() - created) / (1000 * 60 * 60 * 24);
  if (days < 14) return null;
  return Math.floor(days / 7);
}

export function WishlistItemCard({
  item,
  listeners,
  attributes,
  isDragging,
  monthOverCap,
  affordability,
  suggestOptions,
  savingsPotName,
  goalName,
  onEdit,
  onLinkPot,
  onReservePot,
  onCreateTask,
}: WishlistItemCardProps) {
  const weeksInDream =
    item.lane === "dream" ? patienceBadge(item.createdAt) : null;
  const link = item.url?.trim();
  const bestMonth =
    item.lane === "dream" && suggestOptions
      ? suggestBestMonth(Number(item.estimatedPrice ?? 0), suggestOptions)
      : null;

  async function handleCreateTask(event: React.MouseEvent) {
    event.stopPropagation();
    if (onCreateTask) {
      onCreateTask();
      return;
    }
    try {
      await axios.post("/api/tasks", {
        title: `Comprar: ${item.title}`,
        description: item.notes ?? "",
        status: "todo",
        priority: "medium",
        relatedWishlistItemId: item.id,
        estimatedCost: Number(item.estimatedPrice ?? 0),
      });
      toast.success("Tarefa criada.");
    } catch {
      toast.error("Não foi possível criar a tarefa.");
    }
  }

  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-2 rounded-2xl border border-border bg-transparent p-3 text-left transition-colors duration-200 hover:bg-card/75 dark:bg-default-50/30",
        isDragging && "opacity-60 ring-2 ring-brand/30",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...listeners}
          {...attributes}
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 space-y-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-6 rounded-full bg-primary/10 text-primary border-transparent text-xs">
              {item.category}
            </Badge>
            <Badge
              className="h-6 rounded-full border-border bg-transparent text-foreground text-xs"
              variant="outline"
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
            {affordability ? (
              <Badge
                className={cn(
                  "h-6 rounded-full text-xs",
                  AFFORDABILITY_STYLE[affordability],
                )}
              >
                {AFFORDABILITY_LABEL[affordability]}
              </Badge>
            ) : null}
            {bestMonth ? (
              <Badge className="h-6 rounded-full bg-brand-soft text-brand border-transparent text-xs">
                <CalendarPlus className="mr-1 h-3 w-3" />
                Cabe melhor em {bestMonth}
              </Badge>
            ) : null}
            {weeksInDream !== null ? (
              <Badge className="h-6 rounded-full bg-warning/10 text-warning border-transparent text-xs">
                Parado há {weeksInDream}{" "}
                {weeksInDream === 1 ? "semana" : "semanas"} nos sonhos
              </Badge>
            ) : null}
            {monthOverCap ? (
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-danger shadow-sm shadow-danger/40"
                title="Mês acima do teto da lista"
              />
            ) : null}
          </div>
          <p className="line-clamp-2 font-medium leading-snug">{item.title}</p>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Ver link
            </a>
          ) : null}
          <p className="text-sm font-semibold text-foreground">
            {item.status === "purchased" && item.actualPrice !== undefined
              ? brl.format(Number(item.actualPrice))
              : brl.format(Number(item.estimatedPrice ?? 0))}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {item.status === "purchased" ? "(real)" : "(estim.)"}
            </span>
          </p>
        </button>
      </div>

      {(item.savingsPotId || item.financialGoalId) && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {item.savingsPotId && savingsPotName ? (
            <EntityChip
              href="/finance?tab=mais"
              label={savingsPotName}
              icon={<PiggyBank className="h-3 w-3" />}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
          {item.financialGoalId && goalName ? (
            <EntityChip
              href="/finance?tab=mais"
              label={goalName}
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pl-6">
        {item.savingsPotId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-full text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onReservePot?.();
            }}
          >
            <PiggyBank className="h-3 w-3" />
            Reservar no cofrinho
          </Button>
        ) : item.status !== "purchased" && item.status !== "cancelled" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onLinkPot?.();
            }}
          >
            <PiggyBank className="h-3 w-3" />
            Vincular cofrinho
          </Button>
        ) : null}
        {item.status === "ready" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full text-xs"
            onClick={handleCreateTask}
          >
            <ListTodo className="h-3 w-3" />
            Criar tarefa
          </Button>
        ) : null}
      </div>
    </div>
  );
}
