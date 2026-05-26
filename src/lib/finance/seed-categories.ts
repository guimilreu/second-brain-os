import { FINANCE_TRANSACTION_CATEGORIES } from "@/features/finance/lib/categories";
import { Category } from "@/models/Category";

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function inferKind(name: string): "income" | "expense" | "both" {
  if (["Freelance", "Salário", "Investimento"].includes(name)) return "income";
  if (name === "Transferência") return "both";
  return "expense";
}

export async function ensureDefaultCategories(userId: string) {
  const n = await Category.countDocuments({ userId });
  if (n > 0) return;

  await Category.insertMany(
    FINANCE_TRANSACTION_CATEGORIES.map((name, displayOrder) => ({
      userId,
      name,
      slug: slugify(name),
      kind: inferKind(name),
      displayOrder,
    })),
  );
}
