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
import { Plus, ShoppingBag, Sparkles, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WishlistOverview, WishlistOverviewItem } from "@/features/wishlist/lib/types";
import { affordabilityScore, type SuggestBestMonthOptions } from "@/features/wishlist/lib/aggregation";
import { formatMonthKeyLabel } from "@/features/wishlist/lib/format";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { InstallmentDialog } from "@/features/finance/components/dialogs/InstallmentDialog";
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

function columnIdForItem(item: WishlistOverviewItem, focusMonthKey: string) {
  if (item.lane === "dream") {
    return "dream";
  }
  if (item.lane === "archive") {
    return "archive";
  }
  if (
    item.lane === "planned" &&
    item.plannedMonthKey &&
    String(item.plannedMonthKey) === focusMonthKey
  ) {
    return "focus";
  }
  return "dream";
}

const COLUMN_IDS = ["dream", "focus", "archive"] as const;

function lanePayloadFromColumn(
  columnId: string,
  previous: WishlistOverviewItem,
  focusMonthKey: string,
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
  return { lane: "planned", plannedMonthKey: focusMonthKey || null };
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
  affordability?: ReturnType<typeof affordabilityScore> | null;
  suggestOptions?: SuggestBestMonthOptions;
  savingsPotName?: string;
  goalName?: string;
  onEdit: (item: WishlistOverviewItem) => void;
  onLinkPot: (item: WishlistOverviewItem) => void;
  onReservePot: (item: WishlistOverviewItem) => void;
};

function WishlistSortableWrap({
  item,
  monthOverCap,
  affordability,
  suggestOptions,
  savingsPotName,
  goalName,
  onEdit,
  onLinkPot,
  onReservePot,
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
        affordability={affordability}
        suggestOptions={suggestOptions}
        savingsPotName={savingsPotName}
        goalName={goalName}
        onEdit={() => onEdit(item)}
        onLinkPot={() => onLinkPot(item)}
        onReservePot={() => onReservePot(item)}
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
  freeToSpend: number;
  plannedTotal: number;
  suggestOptions?: SuggestBestMonthOptions;
  potNameById: Record<string, string>;
  goalNameById: Record<string, string>;
  onEdit: (item: WishlistOverviewItem) => void;
  onLinkPot: (item: WishlistOverviewItem) => void;
  onReservePot: (item: WishlistOverviewItem) => void;
};

function WishlistColumn({
  id,
  title,
  subtitle,
  items,
  monthOverCap,
  freeToSpend,
  plannedTotal,
  suggestOptions,
  potNameById,
  goalNameById,
  onEdit,
  onLinkPot,
  onReservePot,
}: WishlistColumnProps) {
  const droppable = useDroppable({ id });
  const sorted = sortWishItems(items);

  const emptyConfig =
    id === "dream"
      ? {
          icon: Sparkles,
          title: "Nenhum sonho aqui",
          description: "Arraste itens ou crie novos desejos sem mês definido.",
        }
      : id === "focus"
        ? {
            icon: ShoppingBag,
            title: "Mês foco vazio",
            description: "Arraste desejos para planejar compras deste mês.",
          }
        : {
            icon: Archive,
            title: "Arquivo vazio",
            description: "Itens comprados ou cancelados aparecem aqui.",
          };

  const EmptyIcon = emptyConfig.icon;

  return (
    <div
      ref={droppable.setNodeRef}
      className={cn(
        "paper-note flex max-h-[min(70vh,calc(100vh-240px))] min-w-[min(320px,calc(100vw-2rem))] flex-col rounded-[1.75rem] p-3 backdrop-blur-md dark:bg-default-50/30",
        droppable.isOver && "ring-2 ring-primary/35",
      )}
    >
      <div className="mb-3 shrink-0 border-b border-border pb-3">
        <h2 className="font-heading text-lg font-bold tracking-[-0.03em] text-paper-ink">{title}</h2>
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
            <div className="py-2">
              <EmptyState
                icon={EmptyIcon}
                title={emptyConfig.title}
                description={emptyConfig.description}
              />
            </div>
          ) : (
            sorted.map((item) => (
              <WishlistSortableWrap
                key={item.id}
                item={item}
                monthOverCap={monthOverCap}
                affordability={
                  id === "focus"
                    ? affordabilityScore(
                        Number(item.estimatedPrice ?? 0),
                        freeToSpend,
                        plannedTotal,
                      )
                    : null
                }
                suggestOptions={id === "dream" ? suggestOptions : undefined}
                savingsPotName={
                  item.savingsPotId ? potNameById[item.savingsPotId] : undefined
                }
                goalName={
                  item.financialGoalId ? goalNameById[item.financialGoalId] : undefined
                }
                onEdit={onEdit}
                onLinkPot={onLinkPot}
                onReservePot={onReservePot}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

type FinancePrefill = {
  wishlistItemId: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
};

type InstallmentPrefill = {
  wishlistItemId: string;
  title: string;
  totalAmount: number;
  category: string;
  notes?: string;
};

export function WishlistBoard({ overview }: { overview: WishlistOverview }) {
  const confirm = useConfirm();
  const router = useRouter();
  const items = overview.items;
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistOverviewItem | null>(
    null,
  );
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const [prefill, setPrefill] = useState<FinancePrefill | null>(null);
  const [installmentPrefill, setInstallmentPrefill] = useState<InstallmentPrefill | null>(
    null,
  );
  const [prefillRevision, setPrefillRevision] = useState(0);
  const [installmentRevision, setInstallmentRevision] = useState(0);
  const [pendingWishlistItemId, setPendingWishlistItemId] = useState<string | null>(
    null,
  );

  const potNameById = useMemo(
    () => Object.fromEntries(overview.savingsPots.map((row) => [row.id, row.name])),
    [overview.savingsPots],
  );
  const goalNameById = useMemo(
    () => Object.fromEntries(overview.goals.map((row) => [row.id, row.name])),
    [overview.goals],
  );
  const suggestOptions = useMemo<SuggestBestMonthOptions>(
    () => ({
      futureProjection: overview.futureProjection,
      financeHints: overview.financeHints,
      totalsByMonth: overview.totalsByMonth,
      monthKeys: overview.monthKeys,
    }),
    [overview.futureProjection, overview.financeHints, overview.totalsByMonth, overview.monthKeys],
  );

  const extMonthKeys = useMemo(
    () => mergeMonthKeys(overview.monthKeys, items),
    [overview.monthKeys, items],
  );

  const [selectedMonthKey, setSelectedMonthKey] = useState(
    overview.monthKeys[0] ?? extMonthKeys[0] ?? "",
  );

  const columnIds = COLUMN_IDS as unknown as string[];

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
  const availableAfterList =
    overview.availableAfterListByMonth[selectedMonthKey] ??
    freeHint - totalSelected;
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
    setPendingWishlistItemId(payload.wishlistItemId);
    setPrefill(payload);
    setPrefillRevision((value) => value + 1);
    setFinanceOpen(true);
  }

  function openInstallmentFromPurchase(payload: InstallmentPrefill) {
    setPendingWishlistItemId(payload.wishlistItemId);
    setInstallmentPrefill(payload);
    setInstallmentRevision((value) => value + 1);
    setInstallmentOpen(true);
  }

  async function linkWishlistAfterFinance(
    wishlistItemId: string,
    patch: Record<string, string>,
  ) {
    try {
      await axios.patch(`/api/wishlist/items/${wishlistItemId}`, patch);
    } catch {
      toast.error("Compra registrada, mas não foi possível vincular ao item.");
    }
  }

  function openLinkPot(item: WishlistOverviewItem) {
    setEditingItem(item);
    setItemDialogOpen(true);
  }

  function openReservePot(item: WishlistOverviewItem) {
    if (!item.savingsPotId) {
      openLinkPot(item);
      return;
    }
    void (async () => {
      const pot = overview.savingsPots.find((row) => row.id === item.savingsPotId);
      const amount = Number(item.estimatedPrice ?? 0);
      if (!pot?.bankAccountId) {
        toast.error("Este cofrinho não tem conta vinculada.");
        return;
      }
      if (amount <= 0) {
        toast.error("Informe um preço estimado para reservar.");
        openLinkPot(item);
        return;
      }
      const ok = await confirm({
        title: "Reservar no cofrinho?",
        description: `Transferir ${brl.format(amount)} para ${pot.name}.`,
        confirmLabel: "Reservar",
      });
      if (!ok) return;
      try {
        await axios.post("/api/finance/transfers", {
          kind: "account-to-pot",
          fromAccountId: pot.bankAccountId,
          toPotId: item.savingsPotId,
          amount,
          occurredAt: new Date().toISOString(),
          notes: `Reserva wishlist: ${item.title}`,
          status: "confirmed",
        });
        toast.success("Valor reservado no cofrinho.");
        refresh();
      } catch {
        toast.error("Não foi possível reservar no cofrinho.");
      }
    })();
  }

  async function applyDragPatches(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (String(active.id) === String(over.id)) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeItem = items.find((row) => row.id === activeId);
    if (!activeItem) return;

    const sourceCol = columnIdForItem(activeItem, selectedMonthKey);

    function targetColumnFromOver(): string | null {
      if (columnIds.includes(overId)) {
        return overId;
      }
      const overItem = items.find((row) => row.id === overId);
      return overItem ? columnIdForItem(overItem, selectedMonthKey) : null;
    }

    const targetCol = targetColumnFromOver();
    if (!targetCol) return;

    const destWithoutActive = sortWishItems(
      items.filter(
        (row) =>
          columnIdForItem(row, selectedMonthKey) === targetCol && row.id !== activeId,
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
        Object.assign(body, lanePayloadFromColumn(targetCol, activeItem, selectedMonthKey));
      }
      addPatch(row.id, body);
    });

    if (sourceCol !== targetCol) {
      const newSource = sortWishItems(
        items.filter(
          (row) =>
            columnIdForItem(row, selectedMonthKey) === sourceCol && row.id !== activeId,
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
      <div className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Foco do mês
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Planejamento de compras
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBudgetOpen(true)}
                className="rounded-2xl"
              >
                Definir teto mensal
              </Button>
              <Button
                type="button"
                onClick={openCreate}
                className="rounded-2xl"
              >
                <Plus className="h-4 w-4" />
                Novo desejo
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {extMonthKeys.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={key === selectedMonthKey ? "default" : "outline"}
                onClick={() => setSelectedMonthKey(key)}
                className={cn(
                  "rounded-2xl",
                  key !== selectedMonthKey && "text-muted-foreground",
                )}
              >
                {formatMonthKeyLabel(key)}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-surface-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Planejado</p>
              <p className={cn("mt-1 text-xl font-semibold", overSelected ? "text-danger" : "text-foreground")}>
                {brl.format(totalSelected)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Teto</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {capForSelected > 0 ? brl.format(capForSelected) : "Sem teto"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Livre (mês)</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{brl.format(freeHint)}</p>
            </div>
            <div className="rounded-2xl bg-surface-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Livre após lista</p>
              <p className={cn("mt-1 text-xl font-semibold", availableAfterList < 0 ? "text-danger" : "text-foreground")}>
                {brl.format(availableAfterList)}
              </p>
            </div>
          </div>
          {capForSelected > 0 ? (
            <div className="h-2 rounded-full bg-default-100 dark:bg-default-100/40">
              <div
                className={cn(
                  "h-2 rounded-full transition-all",
                  overSelected ? "bg-danger" : "bg-primary",
                )}
                style={{ width: `${capRatio * 100}%` }}
              />
            </div>
          ) : null}

        {categoryRanking.length > 0 ? (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estimado por categoria
            </p>
            <ul className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
              {categoryRanking.map(([cat, amount]) => (
                <li key={cat} className="flex justify-between gap-2 rounded-xl bg-card/60 px-3 py-2 text-muted-foreground">
                  <span className="truncate font-medium text-foreground">{cat}</span>
                  <span className="shrink-0 tabular-nums">{brl.format(amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
            subtitle="Sem mês definido · arraste para o mês foco"
            items={items.filter((row) => columnIdForItem(row, selectedMonthKey) === "dream")}
            monthOverCap={false}
            freeToSpend={freeHint}
            plannedTotal={totalSelected}
            suggestOptions={suggestOptions}
            potNameById={potNameById}
            goalNameById={goalNameById}
            onEdit={openEdit}
            onLinkPot={openLinkPot}
            onReservePot={openReservePot}
          />
          <WishlistColumn
            id="focus"
            title="Mês foco"
            subtitle={`${formatMonthKeyLabel(selectedMonthKey)} · ${brl.format(totalSelected)}${capForSelected > 0 ? ` · teto ${brl.format(capForSelected)}` : ""}`}
            items={items.filter((row) => columnIdForItem(row, selectedMonthKey) === "focus")}
            monthOverCap={overSelected}
            freeToSpend={freeHint}
            plannedTotal={totalSelected}
            suggestOptions={suggestOptions}
            potNameById={potNameById}
            goalNameById={goalNameById}
            onEdit={openEdit}
            onLinkPot={openLinkPot}
            onReservePot={openReservePot}
          />
          <WishlistColumn
            id="archive"
            title="Arquivo"
            subtitle="Comprados e cancelados"
            items={items.filter((row) => columnIdForItem(row, selectedMonthKey) === "archive")}
            monthOverCap={false}
            freeToSpend={freeHint}
            plannedTotal={totalSelected}
            suggestOptions={suggestOptions}
            potNameById={potNameById}
            goalNameById={goalNameById}
            onEdit={openEdit}
            onLinkPot={openLinkPot}
            onReservePot={openReservePot}
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
        onPurchasedOpenInstallment={openInstallmentFromPurchase}
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
        onClose={() => {
          setFinanceOpen(false);
          setPendingWishlistItemId(null);
        }}
        accounts={overview.accounts}
        onSaved={(transactionId) => {
          setFinanceOpen(false);
          if (pendingWishlistItemId && transactionId) {
            void linkWishlistAfterFinance(pendingWishlistItemId, {
              transactionId,
            });
            toast.success("Compra registrada e vinculada.");
          }
          setPendingWishlistItemId(null);
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
                wishlistItemId: prefill.wishlistItemId,
              }
            : null
        }
        prefillRevision={prefillRevision}
      />

      <InstallmentDialog
        open={installmentOpen}
        onClose={() => {
          setInstallmentOpen(false);
          setPendingWishlistItemId(null);
        }}
        accounts={overview.accounts}
        onSaved={(planId) => {
          setInstallmentOpen(false);
          if (pendingWishlistItemId && planId) {
            void linkWishlistAfterFinance(pendingWishlistItemId, {
              installmentPlanId: planId,
            });
            toast.success("Parcelamento vinculado ao item.");
          }
          setPendingWishlistItemId(null);
          refresh();
        }}
        prefilledDefaults={
          installmentPrefill
            ? {
                title: installmentPrefill.title,
                totalAmount: installmentPrefill.totalAmount,
                category: installmentPrefill.category,
                notes: installmentPrefill.notes,
              }
            : null
        }
        prefillRevision={installmentRevision}
      />
    </motion.div>
  );
}
