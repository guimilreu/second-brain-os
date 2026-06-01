"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { FormField, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { ContentReveal } from "@/components/motion/ContentReveal";
import { Loader2, Download } from "lucide-react";

type UserSettings = {
  timezone: string;
  defaultCurrency: string;
  weekStartsOn: number;
  name: string;
  email: string;
};

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Noronha",
  "UTC",
];

const CURRENCIES = [
  { code: "BRL", label: "Real (BRL)" },
  { code: "USD", label: "Dólar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
];

const WEEK_STARTS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 6, label: "Sábado" },
];

export function SettingsForm() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get<{ data: UserSettings }>("/api/user/settings");
      setSettings({
        timezone: res.data.data.timezone ?? "America/Sao_Paulo",
        defaultCurrency: res.data.data.defaultCurrency ?? "BRL",
        weekStartsOn: Number(res.data.data.weekStartsOn ?? 1),
        name: res.data.data.name,
        email: res.data.data.email,
      });
    } catch {
      toast.error("Não foi possível carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await axios.patch<{ data: UserSettings }>("/api/user/settings", {
        timezone: settings.timezone,
        defaultCurrency: settings.defaultCurrency,
        weekStartsOn: settings.weekStartsOn,
      });
      setSettings({
        ...settings,
        timezone: res.data.data.timezone ?? settings.timezone,
        defaultCurrency: res.data.data.defaultCurrency ?? settings.defaultCurrency,
        weekStartsOn: Number(res.data.data.weekStartsOn ?? settings.weekStartsOn),
      });
      toast.success("Configurações salvas.");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await axios.get("/api/user/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `second-brain-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Exportação concluída.");
    } catch {
      toast.error("Erro ao exportar dados.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <ContentReveal loading={loading} skeleton="block" count={1}>
      {!settings ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar suas preferências.</p>
      ) : (
    <form
      onSubmit={(ev) => void handleSubmit(ev)}
      className="paper-note max-w-xl space-y-5 rounded-3xl p-6"
    >
      <FormField label="Fuso horário">
        <Select
          value={settings.timezone}
          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Moeda padrão">
        <Select
          value={settings.defaultCurrency}
          onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Semana começa em">
        <Select
          value={String(settings.weekStartsOn)}
          onChange={(e) =>
            setSettings({ ...settings, weekStartsOn: Number(e.target.value) })
          }
        >
          {WEEK_STARTS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>
      </FormField>

      <Button type="submit" disabled={saving} className="rounded-2xl">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Salvar preferências
      </Button>

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium">Backup dos dados</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe um JSON com contas, transações, tarefas, notas e wishlist.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="mt-3 rounded-2xl"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar JSON
        </Button>
      </div>
    </form>
      )}
    </ContentReveal>
  );
}
