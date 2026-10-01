"use client";

import { create } from "zustand";
import type {
  DateStr,
  MonthKey,
  PaymentMethod,
  Transaction,
  TxType,
} from "@/features/finance/domain/types";

/** Valores iniciais do lançamento rápido (atalhos: guardar na fatura, pagar fatura, mover dinheiro…). */
export type EntryDraft = {
  type?: TxType;
  amountCents?: number;
  description?: string;
  categoryId?: string | null;
  accountId?: string;
  toAccountId?: string | null;
  date?: DateStr;
  method?: PaymentMethod | null;
  installments?: number;
  invoiceMonth?: MonthKey | null;
  notes?: string;
  /** Título do formulário quando é um atalho ("Pagar fatura de outubro"). */
  title?: string;
};

type EntryStore = {
  isOpen: boolean;
  draft: EntryDraft | null;
  /** Lançamento existente em edição (com as parcelas irmãs, se for compra parcelada). */
  editing: Transaction | null;
  openNew: (draft?: EntryDraft) => void;
  openEdit: (transaction: Transaction) => void;
  close: () => void;
};

export const useEntryStore = create<EntryStore>((set) => ({
  isOpen: false,
  draft: null,
  editing: null,
  openNew: (draft) => set({ isOpen: true, draft: draft ?? null, editing: null }),
  openEdit: (transaction) => set({ isOpen: true, draft: null, editing: transaction }),
  close: () => set({ isOpen: false }),
}));
