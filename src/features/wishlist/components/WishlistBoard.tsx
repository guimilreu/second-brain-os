"use client";

/* eslint-disable react-hooks/refs -- @dnd-kit: refs/listeners são API oficial de useSortable/useDroppable */

import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { WishlistOverview, WishlistOverviewItem } from "@/features/wishlist/lib/types";
import { formatMonthKeyLabel } from "@/features/wishlist/lib/format";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { cn } from "@/lib/utils/cn";
import { MonthBudgetDialog } from "./MonthBudgetDialog";
import { WishlistItemCard } from "./WishlistItemCard";
import { WishlistItemDialog } from "./WishlistItemDialog";
import { springPage } from "@/lib/motion/spring";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function sortWishItems(list: WishlistOverviewItem[]) {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    const ac = String(a.createdAt ?? "");
    const bc = String(b.createdAt ?? "");
    return ac.localeCompare(bc);
  });
}

function mergeMonthKeys(boardKeys: string[], itemList: WishlistOverviewItem[]) {
  const merged = new Set(boardKeys);
  for (const row of itemList) {
    if (row.lane === "planned" && row.plannedMonthKey) {
      merged.add(String(row.plannedMonthKey));
    }
  }
  return Array.from(merged).sort();
}

function columnIdForItem(item: WishlistOverviewItem, monthKeys: string[]) {
  if (item.lane === "dream") {
    return "dream";
  }
  if (item.lane === "archive") {
    return "archive";
  }
  if (item.lane === "planned" && item.plannedMonthKey) {
    const key = String(item.plannedMonthKey);
    return `month:${key}`;
  }
  if (item.lane === "planned" && monthKeys[0]) {
    return `month:${monthKeys[0]}`;
  }
  return "dream";
}

function buildColumnIds(monthKeys: string[]) {
  return ["dream", ...monthKeys.map((key) => `month:${key}`), "archive"] as const;
}

function lanePayloadFromColumn(
  columnId: string,
  previous: WishlistOverviewItem,
): { lane: string; plannedMonthKey: string | null } {
  if (columnId === "dream") {
    return { lane: "dream", plannedMonthKey: null };
  }
  if (columnId === "archive") {
    return {
      lane: "archive",
      plannedMonthKey: previous.plannedMonthKey ?? null,
    };
  }
  const monthKey = columnId.startsWith("month:") ? columnId.slice("month:".length) : "";
  return { lane: "planned", plannedMonthKey: monthKey || null };
}

function normalizedPlannedMonthKey(
  value: WishlistOverviewItem["plannedMonthKey"],
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

/** true = nada mudou em sortOrder/lane/mês para este item */
function wishlistDragPatchIsRedundant(
  item: WishlistOverviewItem,
  body: Record<string, unknown>,
): boolean {
  if ("sortOrder" in body && Number(body.sortOrder) !== Number(item.sortOrder)) {
    return false;
  }
  if ("lane" in body && String(body.lane) !== String(item.lane)) {
    return false;
  }
  if ("plannedMonthKey" in body) {
    const next =
      body.plannedMonthKey === null || body.plannedMonthKey === undefined
        ? null
        : String(body.plannedMonthKey);
    if (next !== normalizedPlannedMonthKey(item.plannedMonthKey)) {
      return false;
    }
  }
  return true;
}

type WishlistSortableWrapProps = {
  item: WishlistOverviewItem;
  monthOverCap: boolean;
  onEdit: (item: WishlistOverviewItem) => void;
};

function WishlistSortableWrap({
  item,
  monthOverCap,
  onEdit,
}: WishlistSortableWrapProps) {
  const sortable = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div ref={sortable.setNodeRef} style={style}>
      <WishlistItemCard
        item={item}
        listeners={sortable.listeners as unknown as Record<string, unknown> | undefined}
        attributes={
          sortable.attributes as unknown as Record<string, unknown> | undefined
        }
        isDragging={sortable.isDragging}
        monthOverCap={monthOverCap}
        onEdit={() => onEdit(item)}
      />
    </div>
  );
}

type WishlistColumnProps = {
  id: string;
  title: string;
  subtitle?: string;
  items: WishlistOverviewItem[];
  monthOverCap: boolean;
  onEdit: (item: WishlistOverviewItem) => void;
};

function WishlistColumn({
  id,
  title,
  subtitle,
  items,
  monthOverCap,
  onEdit,
}: WishlistColumnProps) {
  const droppable = useDroppable({ id });
  const sorted = sortWishItems(items);

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "flex max-h-[min(70vh,calc(100vh-240px))] min-w-[min(320px,calc(100vw-2rem))] flex-col rounded-3xl border border-border bg-surface/60 p-3 shadow-sm backdrop-blur-md dark:bg-default-50/30",
        droppable.isOver && "ring-2 ring-primary/35",
      )}
    >
      <div className="mb-3 shrink-0 border-b border-border pb-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <SortableContext
          items={sorted.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              Arraste itens pra cá ou crie novo.
            </p>
          ) : (
            sorted.map((item) => (
              <WishlistSortableWrap
                key={item.id}
                item={item}
                monthOverCap={monthOverCap}
                onEdit={onEdit}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

type FinancePrefill = {
  title: string;
  amount: number;
  category: string;
  notes?: string;
};

export function WishlistBoard({ overview }: { overview: WishlistOverview }) {
  const router = useRouter();
  const items = overview.items;
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistOverviewItem | null>(
    null,
  );
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [prefill, setPrefill] = useState<FinancePrefill | null>(null);
  const [prefillRevision, setPrefillRevision] = useState(0);

  const extMonthKeys = useMemo(
    () => mergeMonthKeys(overview.monthKeys, items),
    [overview.monthKeys, items],
  );

  const [selectedMonthKey, setSelectedMonthKey] = useState(
    overview.monthKeys[0] ?? extMonthKeys[0] ?? "",
  );

  const columnIds = useMemo(
    () => [...buildColumnIds(extMonthKeys)] as string[],
    [extMonthKeys],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const capForSelected =
    overview.monthBudgets.find((row) => row.monthKey === selectedMonthKey)
      ?.capAmount ?? 0;
  const totalSelected = overview.totalsByMonth[selectedMonthKey] ?? 0;
  const freeHint =
    overview.financeHints.find((row) => row.monthKey === selectedMonthKey)
      ?.freeToSpend ?? 0;
  const overSelected = overview.overCapByMonth[selectedMonthKey] ?? false;
  const capRatio = capForSelected > 0 ? Math.min(totalSelected / capForSelected, 1) : 0;

  const categoryRanking = useMemo(() => {
    const byMonth = overview.categoryTotalsByMonth[selectedMonthKey] ?? {};
    return Object.entries(byMonth)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [overview.categoryTotalsByMonth, selectedMonthKey]);

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditingItem(null);
    setItemDialogOpen(true);
  }

  function openEdit(item: WishlistOverviewItem) {
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  function openFinanceFromPurchase(payload: FinancePrefill) {
    setPrefill(payload);
    setPrefillRevision((value) => value + 1);
    setFinanceOpen(true);
  }

  async function applyDragPatches(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeItem = items.find((row) => row.id === activeId);
    if (!activeItem) return;

    const sourceCol = columnIdForItem(activeItem, extMonthKeys);

    function targetColumnFromOver(): string | null {
      if (columnIds.includes(overId)) {
        return overId;
      }
      const overItem = items.find((row) => row.id === overId);
      return overItem ? columnIdForItem(overItem, extMonthKeys) : null;
    }

    const targetCol = targetColumnFromOver();
    if (!targetCol) return;

    const destWithoutActive = sortWishItems(
      items.filter(
        (row) =>
          columnIdForItem(row, extMonthKeys) === targetCol && row.id !== activeId,
      ),
    );

    let insertAt = destWithoutActive.length;
    if (!columnIds.includes(overId)) {
      const index = destWithoutActive.findIndex((row) => row.id === overId);
      if (index >= 0) {
        insertAt = index;
      }
    }

    const newDest = [
      ...destWithoutActive.slice(0, insertAt),
      activeItem,
      ...destWithoutActive.slice(insertAt),
    ];

    const patchMap = new Map<string, Record<string, unknown>>();

    function addPatch(id: string, partial: Record<string, unknown>) {
      const previous = patchMap.get(id) ?? {};
      patchMap.set(id, { ...previous, ...partial });
    }

    newDest.forEach((row, index) => {
      const body: Record<string, unknown> = { sortOrder: index * 100 };
      if (row.id === activeId) {
        Object.assign(body, lanePayloadFromColumn(targetCol, activeItem));
      }
      addPatch(row.id, body);
    });

    if (sourceCol !== targetCol) {
      const newSource = sortWishItems(
        items.filter(
          (row) =>
            columnIdForItem(row, extMonthKeys) === sourceCol && row.id !== activeId,
        ),
      );
      newSource.forEach((row, index) => {
        addPatch(row.id, { sortOrder: index * 100 });
      });
    }

    const dirtyEntries = Array.from(patchMap.entries()).filter(([id, body]) => {
      const row = items.find((rowItem) => rowItem.id === id);
      if (!row) return true;
      return !wishlistDragPatchIsRedundant(row, body);
    });

    if (dirtyEntries.length === 0) return;

    try {
      await Promise.all(
        dirtyEntries.map(([id, body]) => axios.patch(`/api/wishlist/items/${id}`, body)),
      );
      refresh();
    } catch {
      toast.error("Não foi possível atualizar a posição do item.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    void applyDragPatches(event);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPage}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface/80 p-4 backdrop-blur-md dark:bg-default-50/30 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Foco do mês
          </p>
          <div className="flex flex-wrap gap-2">
            {extMonthKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMonthKey(key)}
                className={cn(
                  "rounded-2xl border px-3 py-1.5 text-sm font-medium transition",
                  key === selectedMonthKey
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {formatMonthKeyLabel(key)}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full max-w-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Planejado na lista ({selectedMonthKey})
            </p>
            <span
              className={cn(
                "text-lg font-semibold",
                overSelected ? "text-danger" : "text-foreground",
              )}
            >
              {brl.format(totalSelected)}
            </span>
          </div>
          {capForSelected > 0 ? (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uso vs teto</span>
                <span>
                  {brl.format(totalSelected)} / {brl.format(capForSelected)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-default-100 dark:bg-default-100/40">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    overSelected ? "bg-danger" : "bg-primary",
                  )}
                  style={{ width: `${capRatio * 100}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sem teto definido para este mês.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Livre no financeiro (projeção do mês):{" "}
            <span className="font-semibold text-foreground">
              {brl.format(freeHint)}
            </span>
          </p>
          {categoryRanking.length > 0 ? (
            <div className="rounded-2xl border border-border/80 bg-surface-soft/50 p-3 dark:bg-default-100/10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estimado por categoria
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
                {categoryRanking.map(([cat, amount]) => (
                  <li key={cat} className="flex justify-between gap-2 text-muted-foreground">
                    <span className="truncate font-medium text-foreground">{cat}</span>
                    <span className="shrink-0 tabular-nums">{brl.format(amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBudgetOpen(true)}
              className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
            >
              Definir teto mensal
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Plus className="h-4 w-4" />
              Novo desejo
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <WishlistColumn
            id="dream"
            title="Sonhos"
            subtitle="Sem mês definido · arraste para planejar"
            items={items.filter((row) => columnIdForItem(row, extMonthKeys) === "dream")}
            monthOverCap={false}
            onEdit={openEdit}
          />
          {extMonthKeys.map((monthKey) => {
            const colId = `month:${monthKey}`;
            const cap =
              overview.monthBudgets.find((row) => row.monthKey === monthKey)
                ?.capAmount ?? 0;
            const totalMonth = overview.totalsByMonth[monthKey] ?? 0;
            const subtitle =
              cap > 0 ? `${brl.format(totalMonth)} · teto ${brl.format(cap)}` : `${brl.format(totalMonth)}`;
            const overMonth = overview.overCapByMonth[monthKey] ?? false;
            return (
              <WishlistColumn
                key={colId}
                id={colId}
                title={formatMonthKeyLabel(monthKey)}
                subtitle={subtitle}
                items={items.filter(
                  (row) => columnIdForItem(row, extMonthKeys) === colId,
                )}
                monthOverCap={overMonth}
                onEdit={openEdit}
              />
            );
          })}
          <WishlistColumn
            id="archive"
            title="Arquivo"
            subtitle="Comprados e cancelados"
            items={items.filter(
              (row) => columnIdForItem(row, extMonthKeys) === "archive",
            )}
            monthOverCap={false}
            onEdit={openEdit}
          />
        </div>
      </DndContext>

      <WishlistItemDialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        item={editingItem}
        monthKeys={extMonthKeys}
        onSaved={refresh}
        onPurchasedOpenFinance={openFinanceFromPurchase}
      />

      <MonthBudgetDialog
        key={`wishlist-cap-${budgetOpen}-${selectedMonthKey}-${capForSelected}`}
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        monthKeys={extMonthKeys}
        selectedMonthKey={selectedMonthKey}
        initialCap={capForSelected}
        onSaved={refresh}
      />

      <TransactionDialog
        open={financeOpen}
        onClose={() => setFinanceOpen(false)}
        accounts={overview.accounts}
        onSaved={() => {
          setFinanceOpen(false);
          refresh();
        }}
        prefilledDefaults={
          prefill
            ? {
                title: prefill.title,
                amount: prefill.amount,
                category: prefill.category,
                notes: prefill.notes,
                type: "expense",
              }
            : null
        }
        prefillRevision={prefillRevision}
      />
    </motion.div>
  );
}
