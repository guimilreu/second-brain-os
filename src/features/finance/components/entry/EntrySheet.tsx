"use client";

import { useRef, useState } from "react";
import type { ShellData } from "@/features/finance/server/shell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEntryStore } from "@/stores/entry-store";
import { EntryForm } from "./EntryForm";

// Celular: folha presa embaixo, cantos de cima arredondados; desktop: modal centralizado.
const SHEET_CLASSES = [
  "top-auto bottom-0 left-0 flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-xl rounded-b-none border-x-0 border-b-0 p-0",
  "max-sm:data-open:slide-in-from-bottom-10 max-sm:data-closed:slide-out-to-bottom-10",
  "sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(90dvh,820px)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border-x sm:border-b",
].join(" ");

/** Lançamento rápido: o único formulário de gasto, entrada, estorno e transferência do app. */
export function EntrySheet({ shell }: { shell: ShellData }) {
  const isOpen = useEntryStore((state) => state.isOpen);
  const draft = useEntryStore((state) => state.draft);
  const editing = useEntryStore((state) => state.editing);
  const close = useEntryStore((state) => state.close);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Cada abertura começa um formulário novo, mesmo se a anterior ainda estiver animando o fechamento.
  const [session, setSession] = useState({ open: isOpen, key: 0 });
  if (session.open !== isOpen) {
    setSession({ open: isOpen, key: isOpen ? session.key + 1 : session.key });
  }

  // Edição não abre o teclado no celular; atalho com descrição pronta vai direto para o valor.
  const initialFocus = editing
    ? titleRef
    : draft?.type === "transfer" || draft?.description
      ? amountRef
      : descriptionRef;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        showCloseButton={false}
        initialFocus={initialFocus}
        className={SHEET_CLASSES}
      >
        <EntryForm
          key={session.key}
          shell={shell}
          draft={draft}
          editing={editing}
          titleRef={titleRef}
          descriptionRef={descriptionRef}
          amountRef={amountRef}
          onClose={close}
        />
      </DialogContent>
    </Dialog>
  );
}
