"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

type NoCardStateProps = {
  /** Sem configuração inicial ainda, o caminho mais curto é o assistente (contas, cofres e cartão de uma vez). */
  setupCompleted: boolean;
};

export function NoCardState({ setupCompleted }: NoCardStateProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <EmptyState
        icon={CreditCard}
        title="Nenhum cartão cadastrado"
        description="Cadastre o cartão com o dia em que a fatura fecha e o dia em que vence. Aí o app mostra em qual fatura cai cada compra, o que é parcela e quanto guardar para pagar."
        actionLabel={setupCompleted ? "Cadastrar cartão" : "Fazer a configuração inicial"}
        onAction={() => router.push(setupCompleted ? "/accounts" : "/setup")}
      />
      {setupCompleted ? null : (
        <p className="text-center text-xs text-muted-foreground">
          Prefere cadastrar só o cartão?{" "}
          <Link
            href="/accounts"
            className="font-semibold text-primary-ink hover:underline"
          >
            Vá em Contas e cofres
          </Link>
          .
        </p>
      )}
    </div>
  );
}
