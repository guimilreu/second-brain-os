"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { ColorSwatch, FormActions, FormField, Input, Select } from "@/components/ui/FormField";

type Account = {
  id: string;
  name: string;
  institution: string;
  type: string;
  balance: number;
  color: string;
};

type AccountDialogProps = {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
  onSaved: () => void;
};

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
  { value: "wallet", label: "Carteira / Dinheiro físico" },
  { value: "investment", label: "Investimento" },
  { value: "credit", label: "Cartão de crédito" },
];

function makeInitial(account?: Account | null) {
  return account
    ? { name: account.name, institution: account.institution, type: account.type, balance: account.balance, color: account.color }
    : { name: "", institution: "", type: "checking", balance: 0, color: "#635bff" };
}

export function AccountDialog({ open, onClose, account, onSaved }: AccountDialogProps) {
  const [form, setForm] = useState(() => makeInitial(account));
  const [saving, setSaving] = useState(false);

  function set(key: keyof ReturnType<typeof makeInitial>, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (account?.id) {
        await axios.patch(`/api/finance/accounts/${account.id}`, form);
        toast.success("Conta atualizada.");
      } else {
        await axios.post("/api/finance/accounts", form);
        toast.success("Conta criada.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? "Editar conta" : "Nova conta"}
      description="Bancos, carteiras e cartões de crédito"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome da conta">
            <Input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Nubank"
            />
          </FormField>
          <FormField label="Instituição">
            <Input
              required
              value={form.institution}
              onChange={(e) => set("institution", e.target.value)}
              placeholder="Ex: Nubank S.A."
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Saldo atual (R$)">
            <Input
              type="number"
              step="0.01"
              value={form.balance}
              onChange={(e) => set("balance", parseFloat(e.target.value) || 0)}
            />
          </FormField>
        </div>
        <FormField label="Cor de identificação">
          <ColorSwatch value={form.color} onChange={(c) => set("color", c)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
