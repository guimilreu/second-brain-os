import { notFound } from "next/navigation";
import { CardHeader } from "@/features/finance/components/cards/CardHeader";
import { CardLimit } from "@/features/finance/components/cards/CardLimit";
import { CommitmentsChart } from "@/features/finance/components/cards/CommitmentsChart";
import { InstallmentPlans } from "@/features/finance/components/cards/InstallmentPlans";
import { InvoiceCategories } from "@/features/finance/components/cards/InvoiceCategories";
import { InvoiceHero } from "@/features/finance/components/cards/InvoiceHero";
import { InvoiceItems } from "@/features/finance/components/cards/InvoiceItems";
import { InvoiceTimeline } from "@/features/finance/components/cards/InvoiceTimeline";
import { buildCardScreen, isCardAccount } from "@/features/finance/components/cards/cardView";
import { isMonthKey } from "@/features/finance/domain/dates";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Cartão" };

type CardPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CardPage({ params, searchParams }: CardPageProps) {
  const [{ id }, query, finance] = await Promise.all([params, searchParams, loadFinance()]);
  const card = finance.accounts.find((account) => account.id === id);
  if (!card || !isCardAccount(card)) notFound();

  const month = typeof query.month === "string" && isMonthKey(query.month) ? query.month : null;
  const screen = buildCardScreen(finance, card, month);
  const { selected } = screen;
  const otherCards = finance.accounts.filter((account) => account.card && !account.archived && account.id !== card.id);

  return (
    <div className="space-y-6">
      <CardHeader
        card={card}
        description={`Fecha dia ${card.card.closingDay} · vence dia ${card.card.dueDay}${card.archived ? " · arquivado" : ""}`}
        payDraft={screen.drafts.payDue}
        showAllCards={otherCards.length > 0}
      />

      <InvoiceTimeline
        cardId={card.id}
        invoices={screen.timeline}
        selectedMonth={selected.month}
      />

      <InvoiceHero
        key={selected.month}
        cardId={card.id}
        invoice={selected}
        today={screen.today}
        currentYear={screen.currentYear}
        reserve={screen.reserve}
        payDraft={screen.drafts.paySelected}
        reserveDraft={screen.drafts.reserve}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InvoiceItems
          cardId={card.id}
          month={selected.month}
          isFuture={selected.state === "future"}
          today={screen.today}
          items={screen.items}
          accounts={finance.accounts}
          categories={finance.categories}
        />
        <div className="space-y-6">
          <InvoiceCategories
            shares={screen.categories}
            categories={finance.categories}
          />
          <CommitmentsChart
            cardId={card.id}
            months={screen.commitments}
            currentYear={screen.currentYear}
          />
          <InstallmentPlans
            cardId={card.id}
            plans={screen.plans}
            categories={finance.categories}
            openMonth={screen.openMonth}
            currentYear={screen.currentYear}
          />
          {screen.limit ? (
            <CardLimit
              limitCents={screen.limit.limitCents}
              usedCents={screen.limit.usedCents}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
