"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Account = { id: string; name: string; type: string; balance?: number };
type Pot = { id: string; name: string; bankAccountId?: string; currentAmount?: number };
type Invoice = {
  id: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  status: string;
};

type TransferDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultFromAccountId?: string;
};

type SourceKind = "account" | "pot";
type DestKind = "account" | "pot";
type TransferMode = "standard" | "invoice-payment" | "investment-deposit" | "investment-withdraw";

function inferKind(from: SourceKind, to: DestKind) {
  if (from === "account" && to === "account") return "account-to-account";
  if (from === "account" && to === "pot") return "account-to-pot";
  if (from === "pot" && to === "account") return "pot-to-account";
  return "pot-to-pot";
}

export function TransferDialog({
  open,
  onClose,
  onSaved,
  defaultFromAccountId,
}: TransferDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pots, setPots] = useState<Pot[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mode, setMode] = useState<TransferMode>("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fromKind, setFromKind] = useState<SourceKind>("account");
  const [toKind, setToKind] = useState<DestKind>("account");
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [fromPotId, setFromPotId] = useState("");
  const [toPotId, setToPotId] = useState("");
  const [creditCardAccountId, setCreditCardAccountId] = useState("");
  const [creditCardInvoiceId, setCreditCardInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const kind = useMemo(() => inferKind(fromKind, toKind), [fromKind, toKind]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset ao abrir modal
    setMode("standard");
    setShowAdvanced(false);
    setCreditCardAccountId("");
    setCreditCardInvoiceId("");
    setInvoices([]);
  }, [open, defaultFromAccountId]);

  useEffect(() => {
    if (!open || mode !== "invoice-payment" || !creditCardAccountId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpar faturas ao mudar modo
      setInvoices([]);
      return;
    }
    void axios
      .get<{ data: Invoice[] }>(`/api/finance/credit-cards/${creditCardAccountId}/invoices`)
      .then((res) => {
        const openInvoices = res.data.data.filter((inv) =>
          ["open", "partial", "late"].includes(inv.status),
        );
        setInvoices(openInvoices);
        if (openInvoices[0]) setCreditCardInvoiceId(openInvoices[0].id);
      })
      .catch(() => setInvoices([]));
  }, [open, mode, creditCardAccountId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body: Record<string, unknown> = {
      amount: Number(amount),
      occurredAt: new Date(),
      notes,
      status: "confirmed",
    };

    if (mode === "invoice-payment") {
      body.kind = "invoice-payment";
      body.fromAccountId = fromAccountId;
      body.creditCardInvoiceId = creditCardInvoiceId;
    } else if (mode === "investment-deposit") {
      body.kind = "investment-deposit";
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else if (mode === "investment-withdraw") {
      body.kind = "investment-withdraw";
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else {
      body.kind = kind;
      if (kind === "account-to-account") {
        body.fromAccountId = fromAccountId;
        body.toAccountId = toAccountId;
      } else if (kind === "account-to-pot") {
        body.fromAccountId = fromAccountId;
        body.toPotId = toPotId;
      } else if (kind === "pot-to-account") {
        body.fromPotId = fromPotId;
        body.toAccountId = toAccountId;
      } else {
        body.fromPotId = fromPotId;
        body.toPotId = toPotId;
      }
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

  const checkingAccounts = accounts.filter((a) => a.type !== "credit");
  const creditAccounts = accounts.filter((a) => a.type === "credit");
  const investmentAccounts = accounts.filter((a) => a.type === "investment");
  const selectedInvoice = invoices.find((inv) => inv.id === creditCardInvoiceId);
  const invoiceRemaining = selectedInvoice
    ? Math.max(0, Number(selectedInvoice.total) - Number(selectedInvoice.paidAmount))
    : 0;

  return (
    <Modal open={open} onClose={onClose} title="Mover dinheiro" description="De onde para onde?">
      <form onSubmit={submit} className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between rounded-xl"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          Operações avançadas
          <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
        </Button>

        {showAdvanced ? (
          <div className="rounded-2xl border border-border bg-surface-soft p-4 space-y-3">
            <FormField label="Tipo de operação">
              <Select
                value={mode}
                onChange={(ev) => setMode(ev.target.value as TransferMode)}
              >
                <option value="standard">Transferência comum</option>
                <option value="invoice-payment">Pagamento de fatura</option>
                <option value="investment-deposit">Aporte em investimento</option>
                <option value="investment-withdraw">Resgate de investimento</option>
              </Select>
            </FormField>

            {mode === "invoice-payment" ? (
              <>
                <FormField label="Conta de pagamento">
                  <Select value={fromAccountId} onChange={(ev) => setFromAccountId(ev.target.value)}>
                    <option value="">Selecione</option>
                    {checkingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Cartão">
                  <Select
                    value={creditCardAccountId}
                    onChange={(ev) => setCreditCardAccountId(ev.target.value)}
                  >
                    <option value="">Selecione</option>
                    {creditAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Fatura">
                  <Select
                    value={creditCardInvoiceId}
                    onChange={(ev) => setCreditCardInvoiceId(ev.target.value)}
                  >
                    <option value="">Selecione</option>
                    {invoices.map((inv) => {
                      const remaining = Math.max(0, Number(inv.total) - Number(inv.paidAmount));
                      return (
                        <option key={inv.id} value={inv.id}>
                          Venc. {new Date(inv.dueDate).toLocaleDateString("pt-BR")} — R$ {remaining.toFixed(2)}
                        </option>
                      );
                    })}
                  </Select>
                </FormField>
                {invoiceRemaining > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Em aberto: R$ {invoiceRemaining.toFixed(2)}
                  </p>
                ) : null}
              </>
            ) : null}

            {mode === "investment-deposit" ? (
              <>
                <FormField label="Conta origem">
                  <Select value={fromAccountId} onChange={(ev) => setFromAccountId(ev.target.value)}>
                    <option value="">Selecione</option>
                    {checkingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Conta investimento (destino)">
                  <Select value={toAccountId} onChange={(ev) => setToAccountId(ev.target.value)}>
                    <option value="">Selecione</option>
                    {investmentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            ) : null}

            {mode === "investment-withdraw" ? (
              <>
                <FormField label="Conta investimento (origem)">
                  <Select value={fromAccountId} onChange={(ev) => setFromAccountId(ev.target.value)}>
                    <option value="">Selecione</option>
                    {investmentAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Conta destino">
                  <Select value={toAccountId} onChange={(ev) => setToAccountId(ev.target.value)}>
                    <option value="">Selecione</option>
                    {checkingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            ) : null}
          </div>
        ) : null}

        {mode === "standard" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="De onde">
              <Select
                value={fromKind}
                onChange={(ev) => setFromKind(ev.target.value as SourceKind)}
              >
                <option value="account">Conta</option>
                <option value="pot">Cofrinho</option>
              </Select>
            </FormField>
            <FormField label="Origem">
              {fromKind === "account" ? (
                <Select value={fromAccountId} onChange={(ev) => setFromAccountId(ev.target.value)}>
                  <option value="">Selecione</option>
                  {checkingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select value={fromPotId} onChange={(ev) => setFromPotId(ev.target.value)}>
                  <option value="">Selecione</option>
                  {pots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Para onde">
              <Select value={toKind} onChange={(ev) => setToKind(ev.target.value as DestKind)}>
                <option value="account">Conta</option>
                <option value="pot">Cofrinho</option>
              </Select>
            </FormField>
            <FormField label="Destino">
              {toKind === "account" ? (
                <Select value={toAccountId} onChange={(ev) => setToAccountId(ev.target.value)}>
                  <option value="">Selecione</option>
                  {checkingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select value={toPotId} onChange={(ev) => setToPotId(ev.target.value)}>
                  <option value="">Selecione</option>
                  {pots
                    .filter((p) => !fromAccountId || fromKind !== "account" || p.bankAccountId === fromAccountId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              )}
            </FormField>
          </div>
        ) : null}

        <FormField label="Valor (R$)">
          <Input
            required
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>
        <FormField label="Observações">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
