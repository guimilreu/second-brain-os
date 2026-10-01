import { Types } from "mongoose";
import { todayInTimezone } from "@/features/finance/domain/dates";
import type { Account as AccountType, Category as CategoryType, Recurring as RecurringType, Transaction as TransactionType } from "@/features/finance/domain/types";
import { Account } from "@/models/Account";
import { Category } from "@/models/Category";
import { Recurring } from "@/models/Recurring";
import { Transaction } from "@/models/Transaction";
import { User } from "@/models/User";
import { DEFAULT_TIMEZONE } from "./defaults";
import { CURRENT_TRANSACTION_FILTER } from "./indexes";
import { toAccount, toCategory, toRecurring, toTransaction } from "./mappers";
import { UserError } from "./result";

export type LockedTransaction = TransactionType & { invoiceLocked: boolean };

export type UserState = {
  userId: string;
  today: string;
  accounts: AccountType[];
  accountsById: Map<string, AccountType>;
  categories: CategoryType[];
  recurrings: RecurringType[];
  transactions: LockedTransaction[];
};

/** Estado completo do usuário para as escritas (sem cache e sem efeitos colaterais). */
export async function loadUserState(userId: string): Promise<UserState> {
  const id = new Types.ObjectId(userId);
  const [user, accountDocs, categoryDocs, recurringDocs, transactionDocs] = await Promise.all([
    User.findById(id).lean<Record<string, unknown>>(),
    Account.find({ userId: id }).lean<Record<string, unknown>[]>(),
    Category.find({ userId: id }).lean<Record<string, unknown>[]>(),
    Recurring.find({ userId: id }).lean<Record<string, unknown>[]>(),
    Transaction.find({ userId: id, ...CURRENT_TRANSACTION_FILTER }).lean<Record<string, unknown>[]>(),
  ]);
  const accounts = accountDocs.map((doc) => toAccount(doc as never));
  return {
    userId,
    today: todayInTimezone(String(user?.timezone ?? DEFAULT_TIMEZONE)),
    accounts,
    accountsById: new Map(accounts.map((account) => [account.id, account])),
    categories: categoryDocs.map((doc) => toCategory(doc as never)),
    recurrings: recurringDocs.map((doc) => toRecurring(doc as never)),
    transactions: transactionDocs.map((doc) => ({
      ...toTransaction(doc as never),
      invoiceLocked: Boolean(doc.invoiceLocked),
    })),
  };
}

export function requireAccount(state: UserState, id: string) {
  const account = state.accountsById.get(id);
  if (!account) throw new UserError("Conta não encontrada.");
  return account;
}

export function requireTransaction(state: UserState, id: string) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) throw new UserError("Lançamento não encontrado.");
  return tx;
}

export function systemCategory(state: UserState, key: CategoryType["systemKey"], kind: CategoryType["kind"]) {
  return state.categories.find((category) => category.systemKey === key && category.kind === kind) ?? null;
}
