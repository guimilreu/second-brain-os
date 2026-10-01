import { redirect } from "next/navigation";
import { CardList } from "@/features/finance/components/cards/CardList";
import { NoCardState } from "@/features/finance/components/cards/NoCardState";
import { buildCardListItem, isCardAccount } from "@/features/finance/components/cards/cardView";
import { loadFinance } from "@/features/finance/server/data";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Cartão" };

export default async function CardsPage() {
  const finance = await loadFinance();
  const cards = finance.accounts.filter(isCardAccount).filter((card) => !card.archived);
  if (cards.length === 1) redirect(`/cards/${cards[0].id}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões"
        description={
          cards.length
            ? "Escolha um cartão para ver as faturas, as parcelas e o que guardar."
            : "Faturas, parcelas e quanto guardar para pagar sem susto."
        }
      />
      {cards.length ? (
        <CardList
          items={cards.map((card) => buildCardListItem(finance, card))}
          today={finance.today}
        />
      ) : (
        <NoCardState setupCompleted={finance.setupCompleted} />
      )}
    </div>
  );
}
