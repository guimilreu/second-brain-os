/** Categorias alinhadas a transações e à lista de desejos */
export const FINANCE_TRANSACTION_CATEGORIES = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Roupas",
  "Tecnologia",
  "Assinatura",
  "Freelance",
  "Salário",
  "Investimento",
  "Transferência",
  "Outro",
] as const;

export type FinanceTransactionCategory =
  (typeof FINANCE_TRANSACTION_CATEGORIES)[number];
