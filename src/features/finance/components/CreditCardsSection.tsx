"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";
import { formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";

type CardAccount = { id: string; name: string; institution: string; color: string };
type Invoice = {
  id: string;
  total: number;
  paidAmount: number;
  dueDate: string;
  status: string;
};
type DebitAccount = { id: string; name: string; type: string };

export function CreditCardsSection() {
  const router = useRouter();
  const [cards, setCards] = useState<CardAccount[]>([]);
  const [openByCard, setOpenByCard] = useState<Record<string, Invoice | null>>({});
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payContext, setPayContext] = useState<{ cardId: string; invoice: Invoice } | null>(
    null,
  );
  const [debitAccounts, setDebitAccounts] = useState<DebitAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const accRes = await axios.get<{ data: (CardAccount & { type?: string })[] }>(
        "/api/finance/accounts",
      );
      const credit = accRes.data.data.filter((a) => a.type === "credit");
      const debit = accRes.data.data
        .filter((a) => a.type !== "credit" && a.type !== "loan")
        .map((a) => ({
          id: a.id,
          name: a.name,
          type: String(a.type ?? "checking"),
        }));
      setDebitAccounts(debit);
      setCards(credit);
      const invMap: Record<string, Invoice | null> = {};
      for (const c of credit) {
        try {
          const invRes = await axios.get<{ data: Invoice[] }>(
            `/api/finance/credit-cards/${c.id}/invoices`,
          );
          const list = invRes.data.data;
          const open =
            list.find((i) => ["open", "partial", "late"].includes(i.status)) ?? list[0];
          invMap[c.id] = open ?? null;
        } catch {
          invMap[c.id] = null;
        }
      }
      setOpenByCard(invMap);
    } catch {
      toast.error("Não foi possível carregar cartões e faturas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  function openPayDialog(cardId: string, invoice: Invoice) {
    setPayContext({ cardId, invoice });
    const remaining = Math.max(0, Number(invoice.total) - Number(invoice.paidAmount));
    setPayAmount(
      remaining > 0 ? String(Math.round(remaining * 100) / 100) : "",
    );
    setFromAccountId(debitAccounts[0]?.id ?? "");
    setPayOpen(true);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payContext || !fromAccountId) {
      toast.error("Selecione a conta de débito.");
      return;
    }
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    setPaying(true);
    try {
      await axios.post(
        `/api/finance/credit-cards/${payContext.cardId}/invoices/${payContext.invoice.id}/pay`,
        {
          fromAccountId,
          amount: amt,
          occurredAt: new Date(),
          notes: "Pagamento de fatura (app)",
        },
      );
      toast.success("Pagamento registrado.");
      setPayOpen(false);
      setPayContext(null);
      void load();
      router.refresh();
    } catch {
      toast.error("Não foi possível registrar o pagamento.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl border border-border bg-card" />
        ))}
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-paper-sm">
        <div className="mx-auto mb-4 inline-flex rounded-3xl bg-brand-soft p-4 text-brand">
          <CreditCard className="h-8 w-8" />
        </div>
        <p className="font-semibold">Nenhum cartão cadastrado</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Crie uma conta do tipo &quot;Cartão de crédito&quot; com fechamento e vencimento
          para acompanhar faturas aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const inv = openByCard[card.id];
          const due = inv?.dueDate ? new Date(inv.dueDate) : null;
          const remaining = inv ? Number(inv.total) - Number(inv.paidAmount) : 0;
          return (
            <div key={card.id} className="rounded-3xl border border-border bg-card p-5 shadow-paper-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-brand-soft p-3 text-brand">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{card.name}</p>
                  <p className="text-sm text-muted-foreground">{card.institution}</p>
                </div>
              </div>
              {inv ? (
                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    Fatura: <span className="font-medium">{formatCurrency(remaining)}</span>{" "}
                    restante
                  </p>
                  {due ? (
                    <p className="text-muted-foreground">
                      Vence {format(due, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground capitalize">
                    Situação: {inv.status}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Nenhuma fatura ainda.</p>
              )}
              <Button
                type="button"
                className="mt-4 w-full rounded-2xl"
                variant="outline"
                disabled={!inv || remaining <= 0}
                onClick={() => (inv ? openPayDialog(card.id, inv) : undefined)}
              >
                Pagar fatura
              </Button>
            </div>
          );
        })}
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Pagamento de fatura">
        <form onSubmit={(e) => void submitPayment(e)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O valor sai da conta selecionada e abate o saldo da fatura (transferência interna
            registrada no ledger).
          </p>
          {debitAccounts.length === 0 ? (
            <p className="text-sm text-destructive">
              Cadastre uma conta corrente, poupança ou carteira (não cartão/dívida) para pagar
              faturas.
            </p>
          ) : null}
          <FormField label="Pagar com (conta corrente/poupança)">
            <Select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)}>
              <option value="">Selecione</option>
              {debitAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Valor (R$)">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </FormField>
          <FormActions
            onCancel={() => setPayOpen(false)}
            isLoading={paying}
            submitLabel="Confirmar pagamento"
          />
        </form>
      </Modal>
    </>
  );
}
