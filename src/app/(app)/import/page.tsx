import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { invoiceDates, invoiceMonthFor, summarizeInvoices } from "@/features/finance/domain/card";
import { addMonths } from "@/features/finance/domain/dates";
import { buildSuggestions } from "@/features/finance/domain/suggestions";
import { ImportInvoice, type InvoiceOption } from "@/features/finance/components/import/ImportInvoice";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Importar fatura" };

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; month?: string }>;
}) {
  const finance = await loadFinance();
  const params = await searchParams;
  const cards = finance.accounts.filter((account) => account.card && !account.archived);

  if (!cards.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Importar fatura" />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <CreditCard className="size-6 text-muted-foreground" />
          <p className="text-sm font-bold">Nenhum cartão cadastrado</p>
          <Button size="sm" render={<Link href="/accounts" />}>
            Cadastrar cartão
          </Button>
        </div>
      </div>
    );
  }

  const card = cards.find((item) => item.id === params.card) ?? cards[0];
  const config = card.card!;
  const openMonth = invoiceMonthFor(config, finance.today);
  const summaries = new Map(summarizeInvoices(card, finance.transactions, finance.today).map((item) => [item.month, item]));
  const options: InvoiceOption[] = Array.from({ length: 7 }, (_, offset) => {
    const month = addMonths(openMonth, -offset);
    return {
      month,
      ...invoiceDates(config, month),
      totalCents: summaries.get(month)?.totalCents ?? 0,
      isOpen: offset === 0,
    };
  });
  const defaultMonth = options.some((option) => option.month === params.month)
    ? params.month!
    : addMonths(openMonth, -1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar fatura"
        description="Traga o CSV da fatura do Nubank: compras, parcelas e estornos caem na fatura certa, e você revisa antes."
      />
      <ImportInvoice
        cards={cards.map((item) => ({ id: item.id, name: item.name }))}
        cardId={card.id}
        options={options}
        defaultMonth={defaultMonth}
        cardTransactions={finance.transactions.filter((tx) => tx.accountId === card.id)}
        categories={finance.categories.filter((category) => category.kind === "expense" && !category.archived)}
        suggestions={buildSuggestions(finance.transactions)}
        currentYear={Number(finance.today.slice(0, 4))}
      />
    </div>
  );
}
