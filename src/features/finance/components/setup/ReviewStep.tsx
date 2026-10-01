"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { PercentInput } from "@/features/finance/components/accounts/fields";
import { formatDecimal, parseDecimalInput } from "@/features/finance/components/accounts/presets";
import { summarizeDraft, type SetupDraft } from "./draft";

type ReviewStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
  onEdit: (step: number) => void;
};

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function ReviewStep({ draft, setDraft, onEdit }: ReviewStepProps) {
  const parsed = parseDecimalInput(draft.cdiText);
  const cdi = parsed !== null && !Number.isNaN(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
  const summary = summarizeDraft(draft, cdi);

  const rows: { id: string; label: string; value: React.ReactNode; step: number }[] = [
    {
      id: "accounts",
      label: "Contas e cofres",
      value: (
        <>
          {plural(summary.accountCount, "conta", "contas")} · <Money cents={summary.moneyCents} /> em saldo
        </>
      ),
      step: 0,
    },
    ...summary.cards.map((card) => ({
      id: `card-${card.key}`,
      label: card.name,
      value: (
        <>
          Fecha dia {card.closingDay}, vence dia {card.dueDay} · <Money cents={card.owedCents} /> nas faturas
        </>
      ),
      step: 1,
    })),
    {
      id: "installments",
      label: "Parcelamentos",
      value: summary.installmentCount ? (
        <>
          {plural(summary.installmentCount, "compra", "compras")} ·{" "}
          <Money cents={summary.installmentsRemainingCents} /> nas próximas faturas
        </>
      ) : (
        "Nenhum"
      ),
      step: 2,
    },
    {
      id: "recurrings",
      label: "Fixas",
      value: summary.recurringCount ? (
        <>
          {plural(summary.recurringCount, "fixa", "fixas")} · entram <Money cents={summary.incomeCents} /> e saem{" "}
          <Money cents={summary.expenseCents} /> por mês
        </>
      ) : (
        "Nenhuma"
      ),
      step: 3,
    },
  ];

  return (
    <div className="space-y-6">
      <Panel title="CDI atual" description="Opcional. É a base para estimar quanto seus cofrinhos rendem por mês.">
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
          <FormField label="CDI ao ano" hint="Procure por “CDI hoje”. Dá para mudar depois em Configurações.">
            <PercentInput
              value={draft.cdiText}
              onValueChange={(cdiText) => setDraft((current) => ({ ...current, cdiText }))}
              placeholder="Ex.: 14,9"
            />
          </FormField>
          <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[0.8125rem] sm:mt-6">
            {cdi ? (
              <>
                Com CDI de {formatDecimal(cdi)}% ao ano, seu dinheiro rende cerca de{" "}
                <Money cents={summary.monthlyYieldCents} className="font-semibold text-positive" /> por mês.
              </>
            ) : (
              "Sem o CDI o app só não estima o rendimento; todo o resto funciona igual."
            )}
          </p>
        </div>
      </Panel>

      <Panel title="Revisão" description="Tudo pode ser ajustado depois, na tela de cada área." padded={false}>
        <dl className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <dt className="text-[0.8125rem] font-medium text-muted-foreground">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold">{row.value}</dd>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(row.step)}>
                Editar
              </Button>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
