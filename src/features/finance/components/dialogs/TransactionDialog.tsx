"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { useFinanceCategories } from "@/hooks/use-finance-categories";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import {
  getLastAccountId,
  getLastCategory,
  setLastAccountId,
  setLastCategory,
} from "@/lib/ui/user-defaults";
import { cn } from "@/lib/utils/cn";

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
  wishlistItemId?: string;
};

type TransactionDialogProps = {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  accounts: Account[];
  onSaved: (savedId?: string) => void;
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
      wishlistItemId: "",
    };
  }
  const base = {
    title: "",
    amount: 0,
    type: "expense",
    category: getLastCategory() ?? "Outro",
    bankAccountId: getLastAccountId() ?? "",
    status: "confirmed",
    occurredAt: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    wishlistItemId: prefill?.wishlistItemId ?? "",
  };
  if (!prefill) return base;
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
    wishlistItemId: prefill.wishlistItemId ?? base.wishlistItemId,
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
  const isEdit = Boolean(transaction?.id);
  const { categories } = useFinanceCategories();
  const [form, setForm] = useState(() =>
    makeInitial(transaction, prefilledDefaults ?? null),
  );
  const [showDetails, setShowDetails] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir modal
    setForm(makeInitial(transaction ?? null, prefilledDefaults ?? null));
    setShowDetails(Boolean(transaction?.id));
  }, [open, transaction?.id, prefillRevision, transaction, prefilledDefaults]);

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
        wishlistItemId: form.wishlistItemId || undefined,
        status: isEdit ? form.status : "confirmed",
      };
      if (form.bankAccountId) setLastAccountId(form.bankAccountId);
      setLastCategory(form.category);

      if (transaction?.id) {
        await axios.patch(`/api/finance/transactions/${transaction.id}`, payload);
        toast.success("Transação atualizada.");
        onSaved(transaction.id);
      } else {
        const res = await axios.post<{ data: { id: string } }>(
          "/api/finance/transactions",
          payload,
        );
        toast.success("Transação registrada.");
        onSaved(res.data.data.id);
      }
    } catch {
      toast.error("Erro ao salvar a transação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? "Editar transação" : "Registrar movimento"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.wishlistItemId ? (
          <input type="hidden" name="wishlistItemId" value={form.wishlistItemId} />
        ) : null}

        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                form.type === t
                  ? t === "expense"
                    ? "bg-danger/15 text-danger"
                    : "bg-success/15 text-success"
                  : "bg-surface-soft text-muted-foreground",
              )}
            >
              {t === "expense" ? "Saída" : "Entrada"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Valor (R$)" className="sm:col-span-1">
            <Input
              required
              autoFocus
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount || ""}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </FormField>
          <FormField label="Descrição" className="sm:col-span-1">
            <Input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Mercado, salário..."
            />
          </FormField>
        </div>

        {!isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between rounded-xl"
            onClick={() => setShowDetails((v) => !v)}
          >
            Mais detalhes
            <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
          </Button>
        ) : null}

        {(showDetails || isEdit) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Categoria">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Conta">
              <Select
                value={form.bankAccountId}
                onChange={(e) => set("bankAccountId", e.target.value)}
              >
                <option value="">Sem conta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data">
              <Input
                type="date"
                required
                value={form.occurredAt}
                onChange={(e) => set("occurredAt", e.target.value)}
              />
            </FormField>
            {isEdit ? (
              <FormField label="Status">
                <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="confirmed">Confirmado</option>
                  <option value="planned">Planejado</option>
                  <option value="late">Atrasado</option>
                  <option value="cancelled">Cancelado</option>
                </Select>
              </FormField>
            ) : null}
            <FormField label="Observações" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </FormField>
          </div>
        )}

        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
