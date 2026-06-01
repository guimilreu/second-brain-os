"use client";

import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Circle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { StaggerItem, StaggerList } from "@/components/motion/StaggerList";

type InboxItem =
  | {
      kind: "recurring-late";
      id: string;
      title: string;
      date: string;
      ruleId?: string;
      amount: number;
      type?: "income" | "expense";
      category?: string;
    }
  | {
      kind: "invoice-due";
      id: string;
      accountName: string;
      remaining: number;
      dueDate: string;
    }
  | {
      kind: "alert";
      id: string;
      message: string;
      href: string;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      priority: string;
    }
  | {
      kind: "wishlist-over";
      message: string;
    };

type TodayInboxProps = {
  items: InboxItem[];
};

export function TodayInbox({ items }: TodayInboxProps) {
  const router = useRouter();

  async function confirmOccurrence(item: Extract<InboxItem, { kind: "recurring-late" }>) {
    try {
      await axios.post("/api/finance/transactions", {
        title: item.title,
        amount: item.amount,
        type: item.type ?? "expense",
        category: item.category ?? "Outro",
        status: "confirmed",
        occurredAt: new Date().toISOString(),
        recurringRuleId: item.ruleId,
        recurringOccurrenceDate: item.date,
      });
      toast.success("Recorrência confirmada.");
      router.refresh();
    } catch {
      toast.error("Erro ao confirmar.");
    }
  }

  async function postponeOccurrence(item: Extract<InboxItem, { kind: "recurring-late" }>) {
    try {
      const postponedDate = addDays(new Date(), 3);
      await axios.post("/api/finance/transactions", {
        title: item.title,
        amount: item.amount,
        type: item.type ?? "expense",
        category: item.category ?? "Outro",
        status: "planned",
        occurredAt: postponedDate.toISOString(),
        recurringRuleId: item.ruleId,
        recurringOccurrenceDate: item.date,
        notes: "Adiado 3 dias a partir da inbox.",
      });
      toast.success("Previsão adiada e mantida no planejamento.");
      router.refresh();
    } catch {
      toast.error("Não foi possível adiar.");
    }
  }

  async function createReminderFromInbox(title: string) {
    try {
      await axios.post("/api/tasks", {
        title,
        status: "todo",
        priority: "medium",
        plannedFor: new Date(),
      });
      toast.success("Lembrete criado.");
      router.refresh();
    } catch {
      toast.error("Erro ao criar lembrete.");
    }
  }

  async function toggleTask(id: string) {
    try {
      await axios.patch(`/api/tasks/${id}`, { status: "done" });
      toast.success("Tarefa concluída!");
      router.refresh();
    } catch {
      toast.error("Erro ao concluir.");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-success/10 p-6 text-center">
        <p className="font-semibold text-success">Nada pendente hoje</p>
        <p className="mt-1 text-sm text-muted-foreground">Você está em dia.</p>
      </div>
    );
  }

  return (
    <StaggerList className="space-y-2">
      {items.slice(0, 5).map((item) => {
        if (item.kind === "recurring-late") {
          return (
            <StaggerItem
              key={item.id}
              className="paper-row flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-warning">Recorrência atrasada</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void postponeOccurrence(item)}
                  className="text-warning"
                >
                  Adiar 3d
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void createReminderFromInbox(`Confirmar: ${item.title}`)
                  }
                >
                  Criar lembrete
                </Button>
                <Button size="sm" onClick={() => void confirmOccurrence(item)}>
                  Confirmar
                </Button>
              </div>
            </StaggerItem>
          );
        }
        if (item.kind === "invoice-due") {
          return (
            <StaggerItem
              key={item.id}
              className="paper-row flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Fatura {item.accountName} — {formatCurrency(item.remaining)}
                </p>
                <p className="text-xs text-warning">
                  Vence em{" "}
                  {format(new Date(item.dueDate), "dd/MM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void createReminderFromInbox(
                      `Pagar fatura ${item.accountName}`,
                    )
                  }
                >
                  Criar lembrete
                </Button>
                <Link
                  href="/finance?tab=patrimonio"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-surface-soft"
                >
                  Ver cartões
                </Link>
              </div>
            </StaggerItem>
          );
        }
        if (item.kind === "task") {
          return (
            <StaggerItem
              key={item.id}
              className="paper-row flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <button
                type="button"
                onClick={() => void toggleTask(item.id)}
                className="shrink-0 text-muted-foreground hover:text-success"
              >
                <Circle className="h-5 w-5" />
              </button>
              <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
              <span
                className={cn(
                  "text-xs font-semibold",
                  item.priority === "critical" ? "text-danger" : "text-warning",
                )}
              >
                {item.priority}
              </span>
            </StaggerItem>
          );
        }
        if (item.kind === "wishlist-over") {
          return (
            <StaggerItem key="wishlist-over">
              <Link
                href="/wishlist"
                className="paper-row block rounded-2xl px-4 py-3 text-sm text-danger"
              >
                {item.message}
              </Link>
            </StaggerItem>
          );
        }
        return (
          <StaggerItem key={item.id}>
            <Link
              href={item.href}
              className="paper-row block rounded-2xl px-4 py-3 text-sm"
            >
              {item.message}
            </Link>
          </StaggerItem>
        );
      })}
    </StaggerList>
  );
}

type PurchasesWidgetProps = {
  monthKey: string;
  planned: number;
  cap: number;
  freeToSpend: number;
  readyItems: Array<{ id: string; title: string; estimatedPrice: number }>;
};

export function PurchasesWidget({
  monthKey,
  planned,
  cap,
  freeToSpend,
  readyItems,
}: PurchasesWidgetProps) {
  const afterList = freeToSpend - planned;
  const monthLabel = format(new Date(`${monthKey}-01`), "MMMM yyyy", { locale: ptBR });

  return (
    <section className="paper-note rounded-[1.75rem] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Compras</p>
          <h2 className="font-heading text-xl font-bold tracking-[-0.03em]">
            {monthLabel}
          </h2>
        </div>
        <Link href="/wishlist" className="link-button rounded-2xl px-4 py-2 text-sm font-medium">
          Ver lista
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-soft/70 p-3">
          <p className="text-xs text-muted-foreground">Planejado</p>
          <p className="mt-1 font-semibold">{formatCurrency(planned)}</p>
        </div>
        <div className="rounded-2xl bg-surface-soft/70 p-3">
          <p className="text-xs text-muted-foreground">Teto</p>
          <p className="mt-1 font-semibold">{cap > 0 ? formatCurrency(cap) : "—"}</p>
        </div>
        <div
          className={cn(
            "rounded-2xl p-3",
            afterList >= 0 ? "bg-success/10" : "bg-danger/10",
          )}
        >
          <p className="text-xs text-muted-foreground">Livre após lista</p>
          <p
            className={cn(
              "mt-1 font-semibold",
              afterList >= 0 ? "text-success" : "text-danger",
            )}
          >
            {formatCurrency(afterList)}
          </p>
        </div>
      </div>
      {afterList > 0 && readyItems.length > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Você tem {formatCurrency(afterList)} livre após a lista e{" "}
          {readyItems.length} item{readyItems.length !== 1 ? "s" : ""} pronto
          {readyItems.length !== 1 ? "s" : ""} para comprar — considere fechar{" "}
          {readyItems.length === 1 ? "a compra" : "as compras"} este mês.
        </p>
      ) : null}
      {readyItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {readyItems.map((item) => (
            <Link
              key={item.id}
              href="/wishlist"
              className="paper-row flex items-center justify-between rounded-xl px-3 py-2 text-sm"
            >
              <span className="truncate font-medium">{item.title}</span>
              <span className="shrink-0 text-brand">
                Comprei — {formatCurrency(item.estimatedPrice)}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function SprintBar({
  done,
  total,
  progress,
}: {
  done: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="paper-note rounded-[1.75rem] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Sprint da semana</p>
          <p className="font-semibold">
            {done}/{total} tarefas · {progress}%
          </p>
        </div>
        <Link href="/tasks" className="link-button rounded-xl px-3 py-2 text-sm">
          Abrir
        </Link>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export { isSameDay };
