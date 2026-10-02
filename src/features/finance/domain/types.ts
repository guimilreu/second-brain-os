/** Valores monetários sempre em centavos inteiros — nunca float. */
export type Cents = number;
/** Data sem horário (YYYY-MM-DD): evita deslocamento de fuso em datas de compra/vencimento. */
export type DateStr = string;
/** Mês de referência (YYYY-MM). */
export type MonthKey = string;

export const ACCOUNT_KINDS = ["checking", "pocket", "credit_card", "cash"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/**
 * Papel de uma conta/cofre no fluxo do dinheiro:
 * - operating: dinheiro do dia a dia (origem padrão dos pagamentos da instituição);
 * - card_reserve: cofre que acumula o valor da fatura (ligado ao cartão via card.reserveAccountId);
 * - goal: cofre de meta (tem alvo);
 * - savings: reserva/poupança sem alvo.
 */
export const ACCOUNT_PURPOSES = ["operating", "card_reserve", "goal", "savings"] as const;
export type AccountPurpose = (typeof ACCOUNT_PURPOSES)[number];

export const INSTITUTIONS = ["mercadopago", "nubank", "inter", "other"] as const;
export type Institution = (typeof INSTITUTIONS)[number];

export type CycleOverride = { month: MonthKey; closingDate: DateStr; dueDate: DateStr };

export type CardConfig = {
  /** Dia do vencimento (o banco mantém fixo). */
  dueDay: number;
  /**
   * A fatura fecha N dias corridos antes do vencimento (Nubank: 7). Por isso o dia do fechamento
   * muda de mês para mês: vence 05/out → fecha 28/set; vence 05/nov → fecha 29/out.
   */
  closingDaysBeforeDue: number;
  limitCents: Cents | null;
  /** Cofre onde o dinheiro da fatura é guardado até o vencimento. */
  reserveAccountId: string | null;
  cycleOverrides: CycleOverride[];
  /** Faturas até este mês (inclusive) já estavam pagas antes do app: histórico, não dívida. */
  settledThroughMonth: MonthKey | null;
};

export type GoalConfig = {
  targetCents: Cents;
  targetDate: DateStr | null;
  /** Quanto guardar por mês; entra no plano do mês como "Guardar". */
  monthlyCents: Cents | null;
};

export type Account = {
  id: string;
  name: string;
  institution: Institution;
  kind: AccountKind;
  purpose: AccountPurpose | null;
  color: string;
  /** Rendimento em % do CDI (ex.: 120). */
  yieldCdiPct: number | null;
  openingBalanceCents: Cents;
  /** Saldo inicial vale a partir desta data; lançamentos anteriores não mexem no saldo. */
  openingDate: DateStr;
  archived: boolean;
  sortOrder: number;
  card: CardConfig | null;
  goal: GoalConfig | null;
  lastReconciledAt: DateStr | null;
};

export const TX_TYPES = ["expense", "income", "transfer", "refund"] as const;
export type TxType = (typeof TX_TYPES)[number];

export const PAYMENT_METHODS = ["pix", "debit", "credit", "cash", "boleto", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type InstallmentInfo = { groupId: string; index: number; count: number };

export type Transaction = {
  id: string;
  type: TxType;
  amountCents: Cents;
  description: string;
  categoryId: string | null;
  /** expense/refund: conta debitada/creditada · income: destino · transfer: origem. */
  accountId: string;
  /** transfer: destino. */
  toAccountId: string | null;
  /** Quando aconteceu (data da compra, do PIX, do recebimento). */
  date: DateStr;
  /** Mês em que conta no orçamento: fatura para cartão, data para o resto. */
  competence: MonthKey;
  method: PaymentMethod | null;
  /** Fatura (mês de fechamento) de uma compra/estorno no cartão, ou fatura paga por uma transferência. */
  invoiceMonth: MonthKey | null;
  installment: InstallmentInfo | null;
  recurringId: string | null;
  /** Mês da ocorrência da recorrência que este lançamento confirmou. */
  recurringMonth: MonthKey | null;
  notes: string;
};

export type RecurringFrequency = "monthly" | "yearly";

export type Recurring = {
  id: string;
  type: "expense" | "income";
  description: string;
  amountCents: Cents;
  /** Valor varia (luz, água): o plano usa o valor como estimativa. */
  isEstimate: boolean;
  categoryId: string | null;
  accountId: string;
  method: PaymentMethod | null;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  /** 1–12, só para anual. */
  monthOfYear: number | null;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  /** Lança sozinho na data (assinatura no cartão); senão pede confirmação. */
  autoPost: boolean;
  active: boolean;
  skippedMonths: MonthKey[];
};

export type CategoryKind = "expense" | "income";
export type CategorySystemKey = "adjustment" | "yield";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  limitCents: Cents | null;
  archived: boolean;
  sortOrder: number;
  systemKey: CategorySystemKey | null;
};
