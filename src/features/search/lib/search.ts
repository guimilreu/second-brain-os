import { connectToDatabase } from "@/lib/db/mongodb";
import { serializeDocuments } from "@/lib/utils/serialize";
import { FinancialGoal } from "@/models/FinancialGoal";
import { Project } from "@/models/Project";
import { SavingsPot } from "@/models/SavingsPot";
import { Task } from "@/models/Task";
import { Transaction } from "@/models/Transaction";
import { WishlistItem } from "@/models/WishlistItem";

export type SearchResultGroup = {
  domain: string;
  label: string;
  items: Array<{ id: string; title: string; subtitle?: string; href: string }>;
};

export async function searchAll(userId: string, query: string): Promise<SearchResultGroup[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  await connectToDatabase();
  const q = query.trim();
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const [tasks, transactions, wishlist, projects, pots, goals] = await Promise.all([
    Task.find({ userId, title: regex }).limit(8).lean(),
    Transaction.find({ userId, title: regex }).sort({ occurredAt: -1 }).limit(8).lean(),
    WishlistItem.find({ userId, title: regex }).limit(8).lean(),
    Project.find({ userId, isArchived: false, name: regex }).limit(6).lean(),
    SavingsPot.find({ userId, name: regex }).limit(6).lean(),
    FinancialGoal.find({ userId, name: regex }).limit(6).lean(),
  ]);

  const groups: SearchResultGroup[] = [];

  if (tasks.length) {
    groups.push({
      domain: "tasks",
      label: "Tarefas",
      items: serializeDocuments(tasks).map((t) => ({
        id: String(t.id),
        title: String(t.title),
        subtitle: String(t.status),
        href: "/tasks",
      })),
    });
  }

  if (transactions.length) {
    groups.push({
      domain: "transactions",
      label: "Transações",
      items: serializeDocuments(transactions).map((t) => ({
        id: String(t.id),
        title: String(t.title),
        subtitle: String(t.category),
        href: "/finance?tab=movimentos",
      })),
    });
  }

  if (wishlist.length) {
    groups.push({
      domain: "wishlist",
      label: "Compras",
      items: serializeDocuments(wishlist).map((w) => ({
        id: String(w.id),
        title: String(w.title),
        subtitle: String(w.status),
        href: "/wishlist",
      })),
    });
  }

  if (projects.length) {
    groups.push({
      domain: "projects",
      label: "Projetos",
      items: serializeDocuments(projects).map((p) => ({
        id: String(p.id),
        title: String(p.name),
        href: "/tasks",
      })),
    });
  }

  if (pots.length) {
    groups.push({
      domain: "pots",
      label: "Cofrinhos",
      items: serializeDocuments(pots).map((p) => ({
        id: String(p.id),
        title: String(p.name),
        href: "/finance?tab=patrimonio",
      })),
    });
  }

  if (goals.length) {
    groups.push({
      domain: "goals",
      label: "Metas",
      items: serializeDocuments(goals).map((g) => ({
        id: String(g.id),
        title: String(g.name),
        href: "/finance",
      })),
    });
  }

  return groups;
}
