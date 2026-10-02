"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAction } from "@/features/finance/components/shared/useAction";
import type { Category, DateStr } from "@/features/finance/domain/types";
import { completeSetup } from "@/features/finance/server/actions";
import { cn } from "@/lib/utils";
import { AccountsStep } from "./AccountsStep";
import { CardStep } from "./CardStep";
import { buildSetupPayload, initialDraft, STEP_COUNT, validateStep } from "./draft";
import { RecurringStep } from "./RecurringStep";
import { ReviewStep } from "./ReviewStep";

const STEPS = ["Contas", "Cartão", "Fixas", "CDI e revisão"];

type SetupWizardProps = {
  /** Categorias editáveis do usuário (sem as de sistema e arquivadas). */
  categories: Category[];
  today: DateStr;
  cdiAnnualPct: number | null;
};

export function SetupWizard({ categories, today, cdiAnnualPct }: SetupWizardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => initialDraft(cdiAnnualPct, today));
  const [step, setStep] = useState(0);
  const { pending, execute } = useAction();
  const isLast = step === STEP_COUNT - 1;
  const optionalEmpty = step === 2 && draft.recurrings.length === 0;

  function goTo(next: number) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function handleNext() {
    const error = validateStep(step, draft);
    if (error) {
      toast.error(error);
      return;
    }
    goTo(step + 1);
  }

  function handleFinish() {
    for (let index = 0; index < STEP_COUNT; index += 1) {
      const error = validateStep(index, draft);
      if (error) {
        toast.error(error);
        goTo(index);
        return;
      }
    }
    void execute(() => completeSetup(buildSetupPayload(draft)), {
      success: "Pronto! Agora lance as compras que já estão no cartão.",
      // Próximo passo natural: o histórico do cartão, que cai sozinho nas faturas certas.
      onSuccess: (result) => router.push(result.cardId ? `/cards/${result.cardId}` : "/"),
    });
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Configuração inicial"
        description="Seu cenário já vem montado: confira os nomes, coloque os saldos de hoje e pronto."
      />

      <nav aria-label="Passos da configuração">
        <ol className="flex items-center gap-2">
          {STEPS.map((label, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li key={label} className={cn("flex min-w-0 items-center gap-2", index < STEPS.length - 1 && "flex-1")}>
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  disabled={index > step}
                  aria-current={current ? "step" : undefined}
                  className="flex min-w-0 items-center gap-2 rounded-md disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "num grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                      current && "bg-primary text-primary-foreground",
                      done && "bg-primary/15 text-primary-ink",
                      !current && !done && "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-[0.8125rem] font-semibold md:inline",
                      current || done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
                {index < STEPS.length - 1 ? (
                  <span className={cn("h-px min-w-3 flex-1", done ? "bg-primary/40" : "bg-border")} aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm font-semibold md:hidden">
          Passo {step + 1} de {STEPS.length} · {STEPS[step]}
        </p>
      </nav>

      {step === 0 ? <AccountsStep draft={draft} setDraft={setDraft} today={today} /> : null}
      {step === 1 ? <CardStep draft={draft} setDraft={setDraft} today={today} /> : null}
      {step === 2 ? <RecurringStep draft={draft} setDraft={setDraft} categories={categories} /> : null}
      {step === 3 ? (
        <ReviewStep draft={draft} year={Number(today.slice(0, 4))} setDraft={setDraft} onEdit={goTo} />
      ) : null}

      {/* Fica acima da barra inferior do mobile e à direita da sidebar no desktop. */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background/95 backdrop-blur-md sm:bottom-0 lg:left-60">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => goTo(step - 1)}
            disabled={step === 0 || pending}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft />
            Voltar
          </Button>
          <p className="hidden flex-1 text-center text-xs text-muted-foreground sm:block">
            Passo {step + 1} de {STEPS.length}
          </p>
          {isLast ? (
            <Button size="lg" onClick={handleFinish} disabled={pending} className="flex-1 sm:flex-none">
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Concluir
            </Button>
          ) : (
            <Button size="lg" onClick={handleNext} className="flex-1 sm:flex-none">
              {optionalEmpty ? "Pular" : "Continuar"}
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
