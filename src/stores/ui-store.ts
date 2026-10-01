"use client";

import { create } from "zustand";

const PRIVACY_KEY = "sb:hide-values";

type UiStore = {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  isCommandOpen: boolean;
  setCommandOpen: (isOpen: boolean) => void;
  /** Esconde os valores (como o "olhinho" dos apps de banco). */
  hideValues: boolean;
  setHideValues: (hide: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  isSidebarOpen: false,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  isCommandOpen: false,
  setCommandOpen: (isOpen) => set({ isCommandOpen: isOpen }),
  hideValues: false,
  setHideValues: (hide) => {
    try {
      localStorage.setItem(PRIVACY_KEY, hide ? "1" : "0");
    } catch {
      // Navegação privada pode bloquear o storage; a preferência só não persiste.
    }
    document.documentElement.dataset.privacy = hide ? "on" : "off";
    set({ hideValues: hide });
  },
}));

/** Lê a preferência salva (chamado uma vez no cliente). */
export function readStoredHideValues() {
  try {
    return localStorage.getItem(PRIVACY_KEY) === "1";
  } catch {
    return false;
  }
}
