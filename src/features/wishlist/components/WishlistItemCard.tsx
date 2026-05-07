import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type WishlistItemCardProps = {
  item: WishlistOverviewItem;
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  isDragging?: boolean;
  monthOverCap?: boolean;
  onEdit: () => void;
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
  onEdit,
}: WishlistItemCardProps) {
  const weeksInDream =
    item.lane === "dream" ? patienceBadge(item.createdAt) : null;

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-surface p-3 text-left shadow-sm transition hover:border-brand/40 hover:shadow-md dark:bg-default-50/40",
        isDragging && "opacity-60 ring-2 ring-brand/30",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-6 rounded-full bg-primary/10 text-primary border-transparent text-xs">
              {item.category}
            </Badge>
            <Badge className="h-6 rounded-full border-border bg-transparent text-foreground text-xs" variant="outline">
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
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
          <p className="text-sm font-semibold text-foreground">
            {item.status === "purchased" && item.actualPrice !== undefined
              ? brl.format(Number(item.actualPrice))
              : brl.format(Number(item.estimatedPrice ?? 0))}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {item.status === "purchased" ? "(real)" : "(estim.)"}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}
