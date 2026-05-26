"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";

type Account = { id: string; name: string; type: string };
type Pot = { id: string; name: string; bankAccountId?: string };

type TransferDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultFromAccountId?: string;
};

const KINDS = [
  { value: "account-to-account", label: "Entre contas" },
  { value: "account-to-pot", label: "Para cofrinho" },
  { value: "pot-to-account", label: "Cofrinho → conta" },
  { value: "pot-to-pot", label: "Entre cofrinhos" },
];

export function TransferDialog({
  open,
  onClose,
  onSaved,
  defaultFromAccountId,
}: TransferDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pots, setPots] = useState<Pot[]>([]);
  const [kind, setKind] = useState("account-to-account");
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [fromPotId, setFromPotId] = useState("");
  const [toPotId, setToPotId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [a, p] = await Promise.all([
        axios.get<{ data: Account[] }>("/api/finance/accounts"),
        axios.get<{ data: Pot[] }>("/api/finance/savings-pots"),
      ]);
      setAccounts(a.data.data);
      setPots(p.data.data);
      if (defaultFromAccountId) setFromAccountId(defaultFromAccountId);
    })();
  }, [open, defaultFromAccountId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = {
      kind,
      amount: Number(amount),
      occurredAt: new Date(),
      notes,
      status: "confirmed",
    };
    if (kind === "account-to-account") {
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else if (kind === "account-to-pot") {
      body.fromAccountId = fromAccountId;
      body.toPotId = toPotId;
    } else if (kind === "pot-to-account") {
      body.fromPotId = fromPotId;
      body.toAccountId = toAccountId;
    } else if (kind === "pot-to-pot") {
      body.fromPotId = fromPotId;
      body.toPotId = toPotId;
    }
    try {
      await axios.post("/api/finance/transfers", body);
      toast.success("Transferência registrada.");
      onSaved();
      onClose();
    } catch {
      toast.error("Não foi possível registrar (verifique saldos e vínculo do cofrinho).");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mover dinheiro" description="Transferências e aportes">
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Tipo">
          <Select value={kind} onChange={(ev) => setKind(ev.target.value)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </Select>
        </FormField>
        {(kind === "account-to-account" || kind === "account-to-pot") && (
          <FormField label="Conta origem">
            <Select value={fromAccountId} onChange={(ev) => setFromAccountId(ev.target.value)}>
              <option value="">Selecione</option>
              {accounts.filter((a) => a.type !== "credit").map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {(kind === "account-to-account" || kind === "pot-to-account") && (
          <FormField label="Conta destino">
            <Select value={toAccountId} onChange={(ev) => setToAccountId(ev.target.value)}>
              <option value="">Selecione</option>
              {accounts.filter((a) => a.type !== "credit").map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {kind === "account-to-pot" && (
          <FormField label="Cofrinho destino">
            <Select value={toPotId} onChange={(ev) => setToPotId(ev.target.value)}>
              <option value="">Selecione</option>
              {pots
                .filter((p) => !fromAccountId || p.bankAccountId === fromAccountId)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </Select>
          </FormField>
        )}
        {(kind === "pot-to-account" || kind === "pot-to-pot") && (
          <FormField label="Cofrinho origem">
            <Select value={fromPotId} onChange={(ev) => setFromPotId(ev.target.value)}>
              <option value="">Selecione</option>
              {pots.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        {kind === "pot-to-pot" && (
          <FormField label="Cofrinho destino">
            <Select value={toPotId} onChange={(ev) => setToPotId(ev.target.value)}>
              <option value="">Selecione</option>
              {pots.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Valor (R$)">
          <Input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField label="Observações">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
