"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Account = { id: string; name: string; type: string };
type Investment = {
  id: string;
  name: string;
  assetClass: string;
  principal: number;
  currentValue: number;
  purchaseDate: string;
};
type Debt = {
  id: string;
  name: string;
  creditor: string;
  principal: number;
  installments: number;
  startsAt: string;
};

export function InvestmentsDebtsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const [invName, setInvName] = useState("");
  const [invAccount, setInvAccount] = useState("");
  const [invClass, setInvClass] = useState("fixed-income");
  const [invPrincipal, setInvPrincipal] = useState("");
  const [invValue, setInvValue] = useState("");
  const [invDate, setInvDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [debtName, setDebtName] = useState("");
  const [debtCreditor, setDebtCreditor] = useState("");
  const [debtPrincipal, setDebtPrincipal] = useState("");
  const [debtInstallments, setDebtInstallments] = useState("12");
  const [debtStarts, setDebtStarts] = useState(format(new Date(), "yyyy-MM-dd"));

  const load = useCallback(async () => {
    try {
      const [a, i, d] = await Promise.all([
        axios.get<{ data: Account[] }>("/api/finance/accounts"),
        axios.get<{ data: Investment[] }>("/api/finance/investments"),
        axios.get<{ data: Debt[] }>("/api/finance/debts"),
      ]);
      const eligible = a.data.data.filter(
        (x) => x.type !== "credit" && x.type !== "loan",
      );
      setAccounts(eligible);
      setInvestments(i.data.data);
      setDebts(d.data.data);
      setInvAccount((cur) => {
        if (cur) return cur;
        const invAcc = a.data.data.find((x) => x.type === "investment");
        const fallback = eligible[0]?.id ?? "";
        return invAcc?.id ?? fallback;
      });
    } catch {
      toast.error("Não foi possível carregar investimentos e dívidas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  async function addInvestment(e: React.FormEvent) {
    e.preventDefault();
    if (!invAccount || !invName.trim()) {
      toast.error("Preencha conta e nome.");
      return;
    }
    try {
      await axios.post("/api/finance/investments", {
        bankAccountId: invAccount,
        name: invName.trim(),
        assetClass: invClass,
        purchaseDate: new Date(invDate),
        principal: Number(invPrincipal) || 0,
        currentValue: Number(invValue) || 0,
      });
      toast.success("Investimento registrado.");
      setInvName("");
      setInvPrincipal("");
      setInvValue("");
      void load();
    } catch {
      toast.error("Falha ao criar investimento.");
    }
  }

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    if (!debtName.trim()) {
      toast.error("Nome obrigatório.");
      return;
    }
    try {
      await axios.post("/api/finance/debts", {
        name: debtName.trim(),
        creditor: debtCreditor,
        principal: Number(debtPrincipal) || 0,
        installments: Number(debtInstallments) || 1,
        startsAt: new Date(debtStarts),
      });
      toast.success("Dívida registrada.");
      setDebtName("");
      setDebtCreditor("");
      setDebtPrincipal("");
      void load();
    } catch {
      toast.error("Falha ao criar dívida.");
    }
  }

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-3xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <form onSubmit={(ev) => void addInvestment(ev)} className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Investimentos
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Novo ativo</h2>
          <div className="mt-5 space-y-4">
          <FormField label="Conta vinculada (onde o ativo está registrado)">
            <Select value={invAccount} onChange={(e) => setInvAccount(e.target.value)}>
              <option value="">Selecione</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Nome">
            <Input value={invName} onChange={(e) => setInvName(e.target.value)} />
          </FormField>
          <FormField label="Classe">
            <Select value={invClass} onChange={(e) => setInvClass(e.target.value)}>
              <option value="fixed-income">Renda fixa</option>
              <option value="stocks">Ações</option>
              <option value="crypto">Crypto</option>
              <option value="funds">Fundos</option>
              <option value="other">Outro</option>
            </Select>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Principal (R$)">
              <Input
                type="number"
                step="0.01"
                value={invPrincipal}
                onChange={(e) => setInvPrincipal(e.target.value)}
              />
            </FormField>
            <FormField label="Valor atual (R$)">
              <Input
                type="number"
                step="0.01"
                value={invValue}
                onChange={(e) => setInvValue(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Data de compra">
            <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
          </FormField>
          <Button type="submit" className="rounded-2xl">
            Salvar
          </Button>
          </div>
        </form>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-sm font-semibold">Posições</p>
          <ul className="mt-3 space-y-2 text-sm">
            {investments.map((x) => (
              <li key={x.id} className="flex justify-between gap-2 rounded-xl bg-surface-soft px-3 py-2">
                <span>{x.name}</span>
                <span className="text-muted-foreground">
                  {formatCurrency(Number(x.currentValue))}
                </span>
              </li>
            ))}
            {!investments.length ? (
              <li className="text-muted-foreground">Nenhum investimento cadastrado.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <form onSubmit={(ev) => void addDebt(ev)} className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Dívidas
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Novo financiamento</h2>
          <div className="mt-5 space-y-4">
          <FormField label="Nome">
            <Input value={debtName} onChange={(e) => setDebtName(e.target.value)} />
          </FormField>
          <FormField label="Credor (opcional)">
            <Input value={debtCreditor} onChange={(e) => setDebtCreditor(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Principal (R$)">
              <Input
                type="number"
                step="0.01"
                value={debtPrincipal}
                onChange={(e) => setDebtPrincipal(e.target.value)}
              />
            </FormField>
            <FormField label="Parcelas">
              <Input
                type="number"
                min={1}
                value={debtInstallments}
                onChange={(e) => setDebtInstallments(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Início">
            <Input type="date" value={debtStarts} onChange={(e) => setDebtStarts(e.target.value)} />
          </FormField>
          <Button type="submit" className="rounded-2xl">
            Salvar
          </Button>
          </div>
        </form>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm">
          <p className="text-sm font-semibold">Dívidas</p>
          <ul className="mt-3 space-y-2 text-sm">
            {debts.map((x) => (
              <li key={x.id} className="rounded-xl bg-surface-soft px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{x.name}</span>
                  <span>{formatCurrency(Number(x.principal))}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {x.installments} parcelas · início{" "}
                  {format(new Date(x.startsAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </li>
            ))}
            {!debts.length ? (
              <li className="text-muted-foreground">Nenhuma dívida cadastrada.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
