"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionStore } from "@/stores/action-store";
import { formatCurrency, formatShortDate } from "@/lib/utils/format";
import type { ImportFormat } from "@/features/finance/lib/importers/importFile";

type Account = { id: string; name: string };

type PreviewLine = {
  title: string;
  amount: number;
  type: "income" | "expense";
  occurredAt: string;
  externalId?: string;
  selected: boolean;
};

const FORMATS = [
  { value: "ofx", label: "OFX" },
  { value: "csv-generic", label: "CSV genérico" },
  { value: "csv-nubank", label: "CSV Nubank" },
  { value: "csv-mercadopago", label: "CSV Mercado Pago" },
];

export function ImportDialog() {
  const open = useActionStore((s) => s.importOpen);
  const onClose = useActionStore((s) => s.closeImport);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [format, setFormat] = useState("ofx");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [lines, setLines] = useState<PreviewLine[]>([]);
  const [duplicates, setDuplicates] = useState(0);
  const [previewFormat, setPreviewFormat] = useState<ImportFormat>("ofx");
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void axios.get<{ data: Account[] }>("/api/finance/accounts").then((res) => {
      setAccounts(res.data.data);
      if (res.data.data[0]) setAccountId(res.data.data[0].id);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpar ao reabrir
    setFile(null);
    setStep("upload");
    setLines([]);
    setDuplicates(0);
  }, [open]);

  function resetAndClose() {
    onClose();
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !accountId) {
      toast.error("Selecione conta e arquivo.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bankAccountId", accountId);
      fd.append("format", format);
      const res = await fetch("/api/finance/imports/preview", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const body = await res.json();
      const data = body.data ?? body;
      setLines(data.lines ?? []);
      setDuplicates(Number(data.duplicates ?? 0));
      setPreviewFormat(data.format ?? format);
      setStep("preview");
    } catch {
      toast.error("Falha ao analisar o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    const selected = lines.filter((l) => l.selected);
    if (!selected.length) {
      toast.error("Selecione ao menos uma linha.");
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch("/api/finance/imports/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: accountId,
          format: previewFormat,
          originalFileName: file?.name ?? "",
          lines,
        }),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      const imported = body.data?.imported ?? 0;
      const dup = body.data?.duplicates ?? 0;
      toast.success(`Importadas ${imported} linha(s)${dup ? ` (${dup} duplicata(s) ignorada(s))` : ""}.`);
      resetAndClose();
      window.location.reload();
    } catch {
      toast.error("Falha ao importar linhas selecionadas.");
    } finally {
      setCommitting(false);
    }
  }

  const selectedCount = lines.filter((l) => l.selected).length;
  const allSelected = lines.length > 0 && selectedCount === lines.length;

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={step === "upload" ? "Importar extrato" : "Pré-visualização"}
      description={
        step === "upload"
          ? "Escolha a conta e o formato do arquivo."
          : `${lines.length} linha(s) encontrada(s)${duplicates ? ` · ${duplicates} duplicata(s)` : ""}`
      }
      size={step === "preview" ? "lg" : "md"}
    >
      {step === "upload" ? (
        <form onSubmit={handlePreview} className="space-y-4">
          <FormField label="Conta">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Formato">
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Arquivo">
            <input
              type="file"
              accept=".ofx,.csv"
              required
              className="block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </FormField>
          <FormActions onCancel={resetAndClose} isLoading={loading} submitLabel="Analisar" />
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setLines((prev) => prev.map((l) => ({ ...l, selected: next })));
                }}
              />
              Selecionar todas ({selectedCount}/{lines.length})
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("upload")}>
              Voltar
            </Button>
          </div>

          <div className="max-h-[min(24rem,50vh)] overflow-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 p-3" />
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`${line.externalId ?? line.title}-${index}`} className="border-t border-border">
                    <td className="p-3">
                      <Checkbox
                        checked={line.selected}
                        onCheckedChange={(checked) => {
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === index ? { ...l, selected: checked === true } : l,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">
                      {formatShortDate(line.occurredAt)}
                    </td>
                    <td className="max-w-[12rem] truncate p-3">{line.title}</td>
                    <td
                      className={`whitespace-nowrap p-3 text-right font-medium ${
                        line.type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {line.type === "income" ? "+" : "−"}
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetAndClose}>
              Cancelar
            </Button>
            <Button type="button" disabled={committing || selectedCount === 0} onClick={() => void handleCommit()}>
              {committing ? "Importando..." : `Importar ${selectedCount} linha(s)`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
