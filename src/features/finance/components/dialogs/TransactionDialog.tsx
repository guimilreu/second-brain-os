"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { FINANCE_TRANSACTION_CATEGORIES } from "@/features/finance/lib/categories";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";

type Account = { id: string; name: string };

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  bankAccountId?: string;
  status: string;
  occurredAt: string;
  notes: string;
};

type TransactionPrefill = {
  title?: string;
  amount?: number;
  category?: string;
  occurredAt?: string;
  notes?: string;
  type?: string;
};

type TransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  accounts: Account[];
  onSaved: () => void;
  prefilledDefaults?: TransactionPrefill | null;
  prefillRevision?: number;
};

function makeInitial(
  transaction?: Transaction | null,
  prefill?: TransactionPrefill | null,
) {
  if (transaction) {
    return {
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      bankAccountId: transaction.bankAccountId ?? "",
      status: transaction.status,
      occurredAt: format(new Date(transaction.occurredAt), "yyyy-MM-dd"),
      notes: transaction.notes,
    };
  }
  const base = {
    title: "",
    amount: 0,
    type: "expense",
    category: "Outro",
    bankAccountId: "",
    status: "confirmed",
    occurredAt: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  };
  if (!prefill) {
    return base;
  }
  return {
    ...base,
    title: prefill.title ?? base.title,
    amount: prefill.amount ?? base.amount,
    type: prefill.type ?? base.type,
    category: prefill.category ?? base.category,
    occurredAt: prefill.occurredAt
      ? format(new Date(prefill.occurredAt), "yyyy-MM-dd")
      : base.occurredAt,
    notes: prefill.notes ?? base.notes,
  };
}

export function TransactionDialog({
  open,
  onClose,
  transaction,
  accounts,
  onSaved,
  prefilledDefaults,
  prefillRevision = 0,
}: TransactionDialogProps) {
  const [form, setForm] = useState(() =>
    makeInitial(transaction, prefilledDefaults ?? null),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir o modal ou ao mudar item/prefill
    setForm(makeInitial(transaction ?? null, prefilledDefaults ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill só via prefillRevision; objeto prefilledDefaults muda referência ao renderizar
  }, [open, transaction?.id, prefillRevision]);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        occurredAt: new Date(form.occurredAt).toISOString(),
        bankAccountId: form.bankAccountId || undefined,
      };
      if (transaction?.id) {
        await axios.patch(`/api/finance/transactions/${transaction.id}`, payload);
        toast.success("Transação atualizada.");
      } else {
        await axios.post("/api/finance/transactions", payload);
        toast.success("Transação registrada.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a transação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={transaction ? "Editar transação" : "Nova transação"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Descrição" className="sm:col-span-2">
            <Input required value={form.title}
              onChange={(e) => set("title", e.target.value)} placeholder="Ex: Conta de luz" />
          </FormField>
          <FormField label="Tipo">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </Select>
          </FormField>
          <FormField label="Valor (R$)">
            <Input required type="number" step="0.01" min="0.01" value={form.amount}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)} placeholder="0,00" />
          </FormField>
          <FormField label="Categoria">
            <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {FINANCE_TRANSACTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Conta / Banco">
            <Select value={form.bankAccountId} onChange={(e) => set("bankAccountId", e.target.value)}>
              <option value="">Sem conta vinculada</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Data">
            <Input type="date" required value={form.occurredAt}
              onChange={(e) => set("occurredAt", e.target.value)} />
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="confirmed">Confirmado</option>
              <option value="planned">Planejado</option>
              <option value="late">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Observações (opcional)">
          <Textarea rows={2} value={form.notes}
            onChange={(e) => set("notes", e.target.value)} placeholder="Detalhes adicionais..." />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
