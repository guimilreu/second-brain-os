import { requireCurrentUser } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/mongodb";
import { handleApiError } from "@/lib/http/api-response";
import { serializeDocument, serializeDocuments } from "@/lib/utils/serialize";
import { BankAccount } from "@/models/BankAccount";
import { Category } from "@/models/Category";
import { CategoryBudget } from "@/models/CategoryBudget";
import { CreditCardInvoice } from "@/models/CreditCardInvoice";
import { Debt } from "@/models/Debt";
import { ExchangeRate } from "@/models/ExchangeRate";
import { FinanceAlert } from "@/models/FinanceAlert";
import { FinancialGoal } from "@/models/FinancialGoal";
import { ImportBatch } from "@/models/ImportBatch";
import { InstallmentPlan } from "@/models/InstallmentPlan";
import { Investment } from "@/models/Investment";
import { InvestmentMovement } from "@/models/InvestmentMovement";
import { NetWorthSnapshot } from "@/models/NetWorthSnapshot";
import { Note } from "@/models/Note";
import { NoteFolder } from "@/models/NoteFolder";
import { Project } from "@/models/Project";
import { RecurringRule } from "@/models/RecurringRule";
import { SavingsPot } from "@/models/SavingsPot";
import { ScenarioPlan } from "@/models/ScenarioPlan";
import { Task } from "@/models/Task";
import { Transaction } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { User } from "@/models/User";
import { WeeklySprint } from "@/models/WeeklySprint";
import { WishlistItem } from "@/models/WishlistItem";
import { WishlistMonthBudget } from "@/models/WishlistMonthBudget";

export async function GET() {
  try {
    const session = await requireCurrentUser();
    await connectToDatabase();
    const userId = session.userId;

    const [
      user,
      bankAccounts,
      transactions,
      transfers,
      recurringRules,
      savingsPots,
      goals,
      categories,
      categoryBudgets,
      creditCardInvoices,
      installmentPlans,
      investments,
      investmentMovements,
      debts,
      financeAlerts,
      netWorthSnapshots,
      scenarioPlans,
      exchangeRates,
      importBatches,
      projects,
      sprints,
      tasks,
      notes,
      noteFolders,
      wishlistItems,
      wishlistMonthBudgets,
    ] = await Promise.all([
      User.findById(userId).select("-passwordHash").lean(),
      BankAccount.find({ userId }).lean(),
      Transaction.find({ userId }).sort({ occurredAt: -1 }).limit(5000).lean(),
      Transfer.find({ userId }).lean(),
      RecurringRule.find({ userId }).lean(),
      SavingsPot.find({ userId }).lean(),
      FinancialGoal.find({ userId }).lean(),
      Category.find({ userId }).lean(),
      CategoryBudget.find({ userId }).lean(),
      CreditCardInvoice.find({ userId }).lean(),
      InstallmentPlan.find({ userId }).lean(),
      Investment.find({ userId }).lean(),
      InvestmentMovement.find({ userId }).lean(),
      Debt.find({ userId }).lean(),
      FinanceAlert.find({ userId }).lean(),
      NetWorthSnapshot.find({ userId }).lean(),
      ScenarioPlan.find({ userId }).lean(),
      ExchangeRate.find({}).lean(),
      ImportBatch.find({ userId }).lean(),
      Project.find({ userId }).lean(),
      WeeklySprint.find({ userId }).lean(),
      Task.find({ userId }).lean(),
      Note.find({ userId }).lean(),
      NoteFolder.find({ userId }).lean(),
      WishlistItem.find({ userId }).lean(),
      WishlistMonthBudget.find({ userId }).lean(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: user ? serializeDocument(user) : null,
      finance: {
        bankAccounts: serializeDocuments(bankAccounts),
        transactions: serializeDocuments(transactions),
        transfers: serializeDocuments(transfers),
        recurringRules: serializeDocuments(recurringRules),
        savingsPots: serializeDocuments(savingsPots),
        goals: serializeDocuments(goals),
        categories: serializeDocuments(categories),
        categoryBudgets: serializeDocuments(categoryBudgets),
        creditCardInvoices: serializeDocuments(creditCardInvoices),
        installmentPlans: serializeDocuments(installmentPlans),
        investments: serializeDocuments(investments),
        investmentMovements: serializeDocuments(investmentMovements),
        debts: serializeDocuments(debts),
        financeAlerts: serializeDocuments(financeAlerts),
        netWorthSnapshots: serializeDocuments(netWorthSnapshots),
        scenarioPlans: serializeDocuments(scenarioPlans),
        exchangeRates: serializeDocuments(exchangeRates),
        importBatches: serializeDocuments(importBatches),
      },
      tasks: {
        projects: serializeDocuments(projects),
        sprints: serializeDocuments(sprints),
        tasks: serializeDocuments(tasks),
      },
      notes: {
        folders: serializeDocuments(noteFolders),
        notes: serializeDocuments(notes),
      },
      wishlist: {
        items: serializeDocuments(wishlistItems),
        monthBudgets: serializeDocuments(wishlistMonthBudgets),
      },
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="second-brain-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
