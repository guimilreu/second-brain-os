"use client";

import { useState } from "react";
import { CalendarArrowDown, CalendarArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { addMonths } from "@/features/finance/domain/dates";
import { invoiceLabel } from "@/features/finance/domain/labels";
import type { Transaction } from "@/features/finance/domain/types";
import { deleteEntry, moveToInvoice } from "@/features/finance/server/actions";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/Modal";
import { useEntryStore } from "@/stores/entry-store";
import { useAction } from "./useAction";

type TransactionMenuProps = {
  transaction: Transaction;
};

/** Ações de um lançamento: editar, mudar de fatura (cartão) e excluir (com escolha para parcelas). */
export function TransactionMenu({ transaction: tx }: TransactionMenuProps) {
  const openEdit = useEntryStore((state) => state.openEdit);
  const confirm = useConfirm();
  const { pending, execute } = useAction();
  const [scopeOpen, setScopeOpen] = useState(false);
  const isInstallment = Boolean(tx.installment && tx.installment.count > 1);
  const scope = isInstallment ? "group" : "single";

  async function handleDelete() {
    if (isInstallment) {
      setScopeOpen(true);
      return;
    }
    const ok = await confirm({
      title: "Excluir lançamento?",
      description: `"${tx.description}" sai do histórico e os saldos são recalculados.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) await execute(() => deleteEntry({ id: tx.id, scope: "single" }), { success: "Lançamento excluído." });
  }

  async function deleteWithScope(choice: "single" | "following" | "group") {
    const ok = await execute(() => deleteEntry({ id: tx.id, scope: choice }), { success: "Parcelas atualizadas." });
    if (ok) setScopeOpen(false);
  }

  function move(offset: number) {
    if (!tx.invoiceMonth) return;
    const month = addMonths(tx.invoiceMonth, offset);
    void execute(() => moveToInvoice({ id: tx.id, month, scope }), {
      success: `Movido para a ${invoiceLabel(month).toLowerCase()}.`,
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ações do lançamento"
              disabled={pending}
              className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:aria-expanded:opacity-100"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => openEdit(tx)}>
            <Pencil />
            {isInstallment ? "Editar compra" : "Editar"}
          </DropdownMenuItem>
          {tx.invoiceMonth && tx.type !== "transfer" ? (
            <>
              <DropdownMenuItem onClick={() => move(1)}>
                <CalendarArrowDown />
                Jogar para a próxima fatura
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => move(-1)}>
                <CalendarArrowUp />
                Trazer para a fatura anterior
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isInstallment && tx.installment ? (
        <Modal
          open={scopeOpen}
          onClose={() => setScopeOpen(false)}
          title="Excluir parcelas"
          description={`${tx.description} · parcela ${tx.installment.index} de ${tx.installment.count}`}
          size="sm"
        >
          <div className="grid gap-2">
            <Button variant="outline" disabled={pending} onClick={() => void deleteWithScope("single")}>
              Só esta parcela
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => void deleteWithScope("following")}>
              Esta e as próximas
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => void deleteWithScope("group")}>
              A compra inteira ({tx.installment.count} parcelas)
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
