"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { PercentInput } from "@/features/finance/components/accounts/fields";
import { formatDecimal, parseDecimalInput } from "@/features/finance/components/accounts/presets";
import { useAction } from "@/features/finance/components/shared/useAction";
import { updateSettings } from "@/features/finance/server/actions";

// O Brasil não tem mais horário de verão: o deslocamento é fixo.
const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (UTC−3)" },
  { value: "America/Manaus", label: "Manaus (UTC−4)" },
  { value: "America/Cuiaba", label: "Cuiabá (UTC−4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC−5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC−2)" },
  { value: "UTC", label: "UTC" },
];

type PreferencesPanelProps = {
  settings: { cdiAnnualPct: number | null; timezone: string };
  className?: string;
};

export function PreferencesPanel({ settings, className }: PreferencesPanelProps) {
  const [timezone, setTimezone] = useState(settings.timezone);
  const [cdiText, setCdiText] = useState(formatDecimal(settings.cdiAnnualPct));
  const { pending, execute } = useAction();

  const cdi = parseDecimalInput(cdiText);
  const dirty = timezone !== settings.timezone || cdi !== settings.cdiAnnualPct;
  const options = TIMEZONES.some((option) => option.value === settings.timezone)
    ? TIMEZONES
    : [{ value: settings.timezone, label: settings.timezone }, ...TIMEZONES];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cdi !== null && (Number.isNaN(cdi) || cdi < 0 || cdi > 100)) {
      toast.error("CDI inválido: use a taxa ao ano em %, entre 0 e 100.");
      return;
    }
    void execute(() => updateSettings({ timezone, cdiAnnualPct: cdi }), { success: "Preferências salvas." });
  }

  return (
    <Panel title="Preferências" className={className}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField label="Fuso horário" hint="Define o que é “hoje” para lançamentos e faturas.">
          <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="CDI ao ano"
          hint="Base para estimar quanto os cofrinhos rendem por mês (ex.: 120% do CDI)."
        >
          <PercentInput value={cdiText} onValueChange={setCdiText} placeholder="Ex.: 14,9" />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </form>
    </Panel>
  );
}
