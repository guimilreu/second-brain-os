import { PageHeader } from "@/components/ui/PageHeader";
import { WishlistBoard } from "@/features/wishlist/components/WishlistBoard";
import { getWishlistOverview } from "@/features/wishlist/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata = {
  title: "Lista de desejos",
};

export default async function WishlistPage() {
  const user = await requireCurrentUser();
  const overview = await getWishlistOverview(user.userId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compras conscientes"
        title="Lista de desejos e compras planejadas"
        description="Organize por mês, sonhos sem data e arquivo. Tetos opcionais, arraste para replanejar e abra o financeiro só quando quiser ao comprar."
      />
      <WishlistBoard overview={overview} />
    </div>
  );
}
