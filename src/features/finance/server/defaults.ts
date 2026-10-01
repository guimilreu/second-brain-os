import type { Category } from "@/features/finance/domain/types";

type CategorySeed = Pick<Category, "name" | "kind" | "color" | "icon" | "systemKey">;

/** Categorias iniciais, pensadas para o dia a dia do GM. Editáveis em Configurações. */
export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { name: "Alimentação", kind: "expense", color: "#f97316", icon: "utensils", systemKey: null },
  { name: "Mercado", kind: "expense", color: "#84cc16", icon: "shopping-cart", systemKey: null },
  { name: "Transporte", kind: "expense", color: "#0ea5e9", icon: "car", systemKey: null },
  { name: "Moradia", kind: "expense", color: "#6366f1", icon: "home", systemKey: null },
  { name: "Saúde", kind: "expense", color: "#ef4444", icon: "heart-pulse", systemKey: null },
  { name: "Lazer", kind: "expense", color: "#ec4899", icon: "party-popper", systemKey: null },
  { name: "Compras", kind: "expense", color: "#8b5cf6", icon: "shopping-bag", systemKey: null },
  { name: "Assinaturas", kind: "expense", color: "#14b8a6", icon: "repeat", systemKey: null },
  { name: "Educação", kind: "expense", color: "#f59e0b", icon: "graduation-cap", systemKey: null },
  { name: "Cuidados pessoais", kind: "expense", color: "#d946ef", icon: "sparkles", systemKey: null },
  { name: "Viagem", kind: "expense", color: "#06b6d4", icon: "plane", systemKey: null },
  { name: "Presentes", kind: "expense", color: "#f43f5e", icon: "gift", systemKey: null },
  { name: "Trabalho", kind: "expense", color: "#64748b", icon: "briefcase", systemKey: null },
  { name: "Impostos e taxas", kind: "expense", color: "#78716c", icon: "receipt", systemKey: null },
  { name: "Outros", kind: "expense", color: "#94a3b8", icon: "circle-ellipsis", systemKey: null },
  { name: "Ajuste de saldo", kind: "expense", color: "#94a3b8", icon: "scale", systemKey: "adjustment" },
  { name: "Antes do app", kind: "expense", color: "#94a3b8", icon: "history", systemKey: "opening" },
  { name: "Salário", kind: "income", color: "#10b981", icon: "briefcase", systemKey: null },
  { name: "Freelance", kind: "income", color: "#22c55e", icon: "laptop", systemKey: null },
  { name: "Rendimentos", kind: "income", color: "#14b8a6", icon: "trending-up", systemKey: "yield" },
  { name: "Reembolsos", kind: "income", color: "#0ea5e9", icon: "undo-2", systemKey: null },
  { name: "Outros", kind: "income", color: "#94a3b8", icon: "circle-ellipsis", systemKey: null },
  { name: "Ajuste de saldo", kind: "income", color: "#94a3b8", icon: "scale", systemKey: "adjustment" },
];

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
