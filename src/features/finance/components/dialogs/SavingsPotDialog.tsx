"use client";

import { useState, useEffect, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { ColorSwatch, FormActions, FormField, Input, Select } from "@/components/ui/FormField";

type SavingsPot = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  priority: number;
  bankAccountId?: string;
};

type Account = { id: string; name: string; type: string };

type SavingsPotDialogProps = {
  open: boolean;
  onClose: () => void;
  pot?: SavingsPot | null;
  onSaved: () => void;
};

function makeInitial(pot?: SavingsPot | null) {
  return pot
    ? {
        bankAccountId: pot.bankAccountId ?? "",
        name: pot.name,
        targetAmount: pot.targetAmount,
        currentAmount: pot.currentAmount,
        color: pot.color,
        priority: pot.priority,
      }
    : {
        bankAccountId: "",
        name: "",
        targetAmount: 0,
        currentAmount: 0,
        color: "#22c55e",
        priority: 1,
      };
}

export function SavingsPotDialog({ open, onClose, pot, onSaved }: SavingsPotDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(() => makeInitial(pot));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void axios.get<{ data: Account[] }>("/api/finance/accounts").then((res) => {
      startTransition(() => {
        setAccounts(res.data.data);
      });
    });
    startTransition(() => {
      setForm(makeInitial(pot));
    });
  }, [open, pot]);

  type FormKey = keyof ReturnType<typeof makeInitial>;
  function set(key: FormKey, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bankAccountId) {
      toast.error("Selecione a conta do cofrinho.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
      };
      if (pot?.id) {
        await axios.patch(`/api/finance/savings-pots/${pot.id}`, payload);
        toast.success("Cofrinho atualizado.");
      } else {
        await axios.post("/api/finance/savings-pots", payload);
        toast.success("Cofrinho criado.");
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar o cofrinho.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={pot ? "Editar cofrinho" : "Novo cofrinho"}
      description="Cada cofrinho fica atrelado a uma conta (ex.: Mercado Pago).">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Conta">
          <Select
            required
            value={form.bankAccountId}
            onChange={(e) => set("bankAccountId", e.target.value)}
          >
            <option value="">Selecione a conta</option>
            {accounts.filter((a) => a.type !== "credit").map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Nome">
          <Input required value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="Ex: Viagem Europa" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Meta (R$)">
            <Input required type="number" step="0.01" min="0" value={form.targetAmount}
              onChange={(e) => set("targetAmount", parseFloat(e.target.value) || 0)} placeholder="0,00" />
          </FormField>
          <FormField label="Valor atual (R$)">
            <Input type="number" step="0.01" min="0" value={form.currentAmount}
              onChange={(e) => set("currentAmount", parseFloat(e.target.value) || 0)} />
          </FormField>
        </div>
        <FormField label="Prioridade (1 = mais importante)">
          <Input type="number" min={1} max={99} value={form.priority}
            onChange={(e) => set("priority", Number(e.target.value))} />
        </FormField>
        <FormField label="Cor">
          <ColorSwatch value={form.color} onChange={(c) => set("color", c)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
