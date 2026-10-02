"use client";

import Link from "next/link";
import { FileUp, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntryStore } from "@/stores/entry-store";

/** Cartão sem nenhuma compra: o próximo passo é lançar o que já está nas faturas, com a data real. */
export function CardHistoryPrompt({ cardId }: { cardId: string }) {
  const openNew = useEntryStore((state) => state.openNew);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-accent/50 p-5 shadow-xs sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <History className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold">
          Lance o que já está no cartão
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          Use a data em que comprou, parceladas antigas também: cada compra cai sozinha na fatura certa e as parcelas
          nas seguintes. Dá para digitar direto, tipo{" "}
          <span className="font-semibold text-foreground">
            notebook 3600 12x 10/06
          </span>
          .
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Button onClick={() => openNew({ type: "expense", accountId: cardId })}>
          <Plus />
          Lançar compra
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/import?card=${cardId}`} />}
        >
          <FileUp />
          Importar CSV
        </Button>
      </div>
    </section>
  );
}
