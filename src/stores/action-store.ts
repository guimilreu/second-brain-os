"use client";

import { create } from "zustand";

export type TransactionPrefill = {
  title?: string;
  amount?: number;
  category?: string;
  occurredAt?: string;
  notes?: string;
  type?: string;
  wishlistItemId?: string;
};

type ActionStore = {
  transactionOpen: boolean;
  transferOpen: boolean;
  taskOpen: boolean;
  wishlistOpen: boolean;
  importOpen: boolean;
  transactionPrefill: TransactionPrefill | null;
  transferFromAccountId: string | undefined;
  openTransaction: (prefill?: TransactionPrefill) => void;
  closeTransaction: () => void;
  openTransfer: (fromAccountId?: string) => void;
  closeTransfer: () => void;
  openTask: () => void;
  closeTask: () => void;
  openWishlist: () => void;
  closeWishlist: () => void;
  openImport: () => void;
  closeImport: () => void;
};

export const useActionStore = create<ActionStore>((set) => ({
  transactionOpen: false,
  transferOpen: false,
  taskOpen: false,
  wishlistOpen: false,
  importOpen: false,
  transactionPrefill: null,
  transferFromAccountId: undefined,
  openTransaction: (prefill) =>
    set({ transactionOpen: true, transactionPrefill: prefill ?? null }),
  closeTransaction: () => set({ transactionOpen: false, transactionPrefill: null }),
  openTransfer: (fromAccountId) =>
    set({ transferOpen: true, transferFromAccountId: fromAccountId }),
  closeTransfer: () => set({ transferOpen: false, transferFromAccountId: undefined }),
  openTask: () => set({ taskOpen: true }),
  closeTask: () => set({ taskOpen: false }),
  openWishlist: () => set({ wishlistOpen: true }),
  closeWishlist: () => set({ wishlistOpen: false }),
  openImport: () => set({ importOpen: true }),
  closeImport: () => set({ importOpen: false }),
}));
