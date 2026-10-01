import { sumCents } from "@/features/finance/domain/money";
import type { Category } from "@/features/finance/domain/types";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import type { CategoryShare } from "./cardView";

const VISIBLE = 5;

type InvoiceCategoriesProps = {
  shares: CategoryShare[];
  categories: Category[];
};

/** Para onde foi o dinheiro da fatura escolhida (inclui as fixas previstas). */
export function InvoiceCategories({ shares, categories }: InvoiceCategoriesProps) {
  if (!shares.length) return null;
  const total = sumCents(shares.map((share) => share.cents));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const rest = shares.slice(VISIBLE);
  const rows = shares.slice(0, VISIBLE).map((share) => {
    const category = share.categoryId ? categoriesById.get(share.categoryId) : undefined;
    return {
      key: share.categoryId ?? "none",
      name: category?.name ?? "Sem categoria",
      icon: category?.icon,
      color: category?.color,
      cents: share.cents,
    };
  });
  if (rest.length) {
    rows.push({
      key: "rest",
      name: `Outras categorias (${rest.length})`,
      icon: "circle-ellipsis",
      color: undefined,
      cents: sumCents(rest.map((share) => share.cents)),
    });
  }

  return (
    <Panel
      title="Por categoria"
      description="Para onde foi o dinheiro desta fatura"
    >
      <ul className="space-y-3.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-3"
          >
            <CategoryIcon
              icon={row.icon}
              color={row.color}
              size="sm"
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-[0.8125rem]">
                <span className="truncate font-semibold">
                  {row.name}
                </span>
                <Money
                  cents={row.cents}
                  className="font-semibold"
                />
              </div>
              <Meter
                value={(row.cents / total) * 100}
                color={row.color ?? "var(--muted-foreground)"}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
