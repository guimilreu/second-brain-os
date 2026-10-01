import type { Cents } from "@/features/finance/domain/types";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

type CardLimitProps = {
  limitCents: Cents;
  usedCents: Cents;
};

export function CardLimit({ limitCents, usedCents }: CardLimitProps) {
  const availableCents = limitCents - usedCents;

  return (
    <Panel title="Limite">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Disponível
          </p>
          <Money
            cents={availableCents}
            className={cn("mt-0.5 block text-xl font-semibold", availableCents < 0 && "text-negative")}
          />
        </div>
        <p className="text-right text-xs text-muted-foreground">
          usado{" "}
          <Money
            cents={usedCents}
            className="font-semibold text-foreground"
          />
          <br />
          de{" "}
          <Money cents={limitCents} />
        </p>
      </div>
      <Meter
        value={(usedCents / limitCents) * 100}
        tone="auto"
        className="mt-3"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Conta as parcelas futuras: o banco segura o valor cheio da compra.
      </p>
    </Panel>
  );
}
