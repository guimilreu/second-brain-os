import {
  addDays,
  endOfMonth,
  startOfDay,
} from "date-fns";
import { BankAccount } from "@/models/BankAccount";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";
import { Transaction } from "@/models/Transaction";

function clampDay(year: number, month: number, day: number) {
  const last = endOfMonth(new Date(year, month, 1));
  return Math.min(day, last.getDate());
}

/** Próximo calendário com dia `day` a partir de `from` (inclusivo). */
function nextCalendarDayOnOrAfter(from: Date, day: number) {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = clampDay(y, m, day);
  let candidate = new Date(y, m, d);
  if (candidate < startOfDay(from)) {
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    candidate = new Date(ny, nm, clampDay(ny, nm, day));
  }
  return candidate;
}

/** Ciclo da fatura que contém `purchaseDate` com fechamento no `closingDay`. */
export function computeInvoiceBounds(
  closingDay: number,
  dueDay: number,
  purchaseDate: Date,
) {
  const p = startOfDay(purchaseDate);
  let y = p.getFullYear();
  let m = p.getMonth();
  let closing = new Date(y, m, clampDay(y, m, closingDay));
  if (p > closing) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    closing = new Date(y, m, clampDay(y, m, closingDay));
  }

  let pm = closing.getMonth() - 1;
  let py = closing.getFullYear();
  if (pm < 0) {
    pm = 11;
    py -= 1;
  }
  const prevClosing = new Date(py, pm, clampDay(py, pm, closingDay));
  const cycleStart = addDays(prevClosing, 1);
  const cycleEnd = closing;
  const dueDate = nextCalendarDayOnOrAfter(addDays(closing, 1), dueDay);

  return { cycleStart, cycleEnd, closingDate: closing, dueDate };
}

export async function ensureInvoiceForDate(
  userId: string,
  bankAccountId: string,
  account: { closingDay?: number; dueDay?: number },
  purchaseDate: Date,
) {
  const closingDay = account.closingDay;
  const dueDay = account.dueDay;
  if (closingDay === undefined || dueDay === undefined) {
    throw new Error("Conta de cartão precisa de closingDay e dueDay.");
  }

  const { cycleStart, cycleEnd, closingDate, dueDate } = computeInvoiceBounds(
    closingDay,
    dueDay,
    purchaseDate,
  );

  let invoice = await CreditCardInvoice.findOne({
    userId,
    bankAccountId,
    cycleStart,
    cycleEnd,
  });

  if (!invoice) {
    invoice = await CreditCardInvoice.create({
      userId,
      bankAccountId,
      cycleStart,
      cycleEnd,
      closingDate,
      dueDate,
      total: 0,
      paidAmount: 0,
      status: "open",
    });
  }

  return invoice;
}

export async function recalculateInvoiceTotal(invoiceId: string) {
  const rows = await Transaction.aggregate<{ s: number }>([
    {
      $match: {
        creditCardInvoiceId: invoiceId,
        type: "expense",
        status: { $nin: ["cancelled"] },
      },
    },
    { $group: { _id: null, s: { $sum: "$amount" } } },
  ]);
  const total = rows[0]?.s ?? 0;
  const inv = await CreditCardInvoice.findById(invoiceId);
  if (!inv) return;
  const paid = Number(inv.paidAmount ?? 0);
  let status = String(inv.status);
  if (total <= 0 && paid <= 0) status = "open";
  else if (paid >= total && total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  else if (new Date() > inv.dueDate && total > paid) status = "late";
  else status = "open";

  await CreditCardInvoice.updateOne({ _id: invoiceId }, { $set: { total, status } });
}

export async function assertCreditAccount(userId: string, bankAccountId: string) {
  const acc = await BankAccount.findOne({
    _id: bankAccountId,
    userId,
    type: "credit",
    isArchived: false,
  });
  if (!acc) throw new Error("Cartão não encontrado.");
  if (acc.closingDay === undefined || acc.dueDay === undefined) {
    throw new Error("Configure dia de fechamento e vencimento do cartão.");
  }
  return acc;
}
