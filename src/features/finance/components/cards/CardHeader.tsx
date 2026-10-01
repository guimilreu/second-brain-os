"use client";

import Link from "next/link";
import { FileUp, Plus } from "lucide-react";
import type { Account } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useEntryStore, type EntryDraft } from "@/stores/entry-store";

type CardHeaderProps = {
  card: Pick<Account, "id" | "name" | "institution">;
  description: string;
  /** Fatura fechada mais antiga ainda não paga. */
  payDraft: EntryDraft | null;
  showAllCards: boolean;
};

export function CardHeader({ card, description, payDraft, showAllCards }: CardHeaderProps) {
  const openNew = useEntryStore((state) => state.openNew);

  return (
    <div className="flex items-start gap-3">
      <InstitutionMark
        institution={card.institution}
        name={card.name}
        size="lg"
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <PageHeader
          title={card.name}
          description={description}
          actions={
            <>
              {showAllCards ? (
                <Link
                  href="/cards"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Outros cartões
                </Link>
              ) : null}
              <Link
                href={`/import?card=${card.id}`}
                className={buttonVariants({ variant: "ghost" })}
              >
                <FileUp />
                Importar fatura
              </Link>
              <Button
                variant={payDraft ? "outline" : "default"}
                onClick={() => openNew({ type: "expense", accountId: card.id })}
              >
                <Plus />
                Lançar compra
              </Button>
              {payDraft ? (
                <Button onClick={() => openNew(payDraft)}>
                  Pagar fatura
                </Button>
              ) : null}
            </>
          }
        />
      </div>
    </div>
  );
}
