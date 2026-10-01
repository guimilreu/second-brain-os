"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/features/finance/server/result";

type Options<T> = {
  /** Mensagem do toast de sucesso (omitir = sem toast). */
  success?: string;
  onSuccess?: (data: T) => void;
};

/**
 * Executa uma server action com estado de carregamento e toast.
 * A action já atualiza a tela (refresh no servidor); aqui só tratamos feedback.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  const execute = useCallback(<T,>(action: () => Promise<ActionResult<T>>, options: Options<T> = {}) => {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          if (options.success) toast.success(options.success);
          options.onSuccess?.(result.data);
          resolve(true);
        } else {
          toast.error(result.error);
          resolve(false);
        }
      });
    });
  }, []);

  return { pending, execute };
}
