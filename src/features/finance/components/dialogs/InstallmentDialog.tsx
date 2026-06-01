"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { useFinanceCategories } from "@/hooks/use-finance-categories";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { getLastAccountId, getLastCategory, setLastAccountId, setLastCategory } from "@/lib/ui/user-defaults";

type Account = { id: string; name: string; type?: string };

type InstallmentPrefill = {
  title?: string;
  category?: string;
  totalAmount?: number;
  notes?: string;
};

type InstallmentDialogProps = {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  onSaved: (planId?: string) => void;
  prefilledDefaults?: InstallmentPrefill | null;
  prefillRevision?: number;
};

function makeInitial(prefill?: InstallmentPrefill | null) {
  const base = {
    bankAccountId: getLastAccountId() ?? "",
    title: "",
    category: getLastCategory() ?? "Outro",
    totalAmount: 0,
    installments: 12,
    firstChargeDate: format(new Date(), "yyyy-MM-dd"),
    interestRate: 0,
    notes: "",
  };
  if (!prefill) return base;
  return {
    ...base,
    title: prefill.title ?? base.title,
    category: prefill.category ?? base.category,
    totalAmount: prefill.totalAmount ?? base.totalAmount,
    notes: prefill.notes ?? base.notes,
  };
}

export function InstallmentDialog({
  open,
  onClose,
  accounts,
  onSaved,
  prefilledDefaults,
  prefillRevision = 0,
}: InstallmentDialogProps) {
  const { categories } = useFinanceCategories();
  const [form, setForm] = useState(() => makeInitial(prefilledDefaults ?? null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir modal
    setForm(makeInitial(prefilledDefaults ?? null));
  }, [open, prefillRevision, prefilledDefaults]);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bankAccountId) {
      toast.error("Selecione a conta.");
      return;
    }
    if (form.installments < 2) {
      toast.error("Informe ao menos 2 parcelas.");
      return;
    }
    setSaving(true);
    try {
      if (form.bankAccountId) setLastAccountId(form.bankAccountId);
      setLastCategory(form.category);

      const res = await axios.post<{ data: { id: string } }>("/api/finance/installments", {
        bankAccountId: form.bankAccountId,
        title: form.title,
        category: form.category,
        totalAmount: Number(form.totalAmount),
        installments: Number(form.installments),
        firstChargeDate: new Date(form.firstChargeDate).toISOString(),
        interestRate: Number(form.interestRate) || undefined,
        notes: form.notes,
      });
      toast.success("Parcelamento criado.");
      onSaved(res.data.data.id);
    } catch {
      toast.error("Erro ao criar parcelamento.");
    } finally {
      setSaving(false);
    }
  }

  const piece =
    form.installments >= 2
      ? Math.round((Number(form.totalAmount) / Number(form.installments)) * 100) / 100
      : 0;

  return (
    <Modal open={open} onClose={onClose} title="Novo parcelamento" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Descrição">
          <Input
            required
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex: Notebook, curso..."
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Valor total (R$)">
            <Input
              required
              type="number"
              step="0.01"
              min="0.01"
              value={form.totalAmount || ""}
              onChange={(e) => set("totalAmount", parseFloat(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="Parcelas">
            <Input
              required
              type="number"
              min={2}
              max={120}
              value={form.installments}
              onChange={(e) => set("installments", parseInt(e.target.value, 10) || 2)}
            />
          </FormField>
        </div>

        {form.totalAmount > 0 && form.installments >= 2 ? (
          <p className="text-sm text-muted-foreground">
            Impacto: {form.installments} parcelas de{" "}
            {piece.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Conta">
            <Select
              required
              value={form.bankAccountId}
              onChange={(e) => set("bankAccountId", e.target.value)}
            >
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.type === "credit" ? " (cartão)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Categoria">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Primeira cobrança">
            <Input
              type="date"
              required
              value={form.firstChargeDate}
              onChange={(e) => set("firstChargeDate", e.target.value)}
            />
          </FormField>
          <FormField label="Juros mensal (%)">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={form.interestRate || ""}
              onChange={(e) => set("interestRate", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </FormField>
        </div>

        <FormField label="Observações">
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </FormField>

        <FormActions onCancel={onClose} isLoading={saving} submitLabel="Criar parcelamento" />
      </form>
    </Modal>
  );
}
