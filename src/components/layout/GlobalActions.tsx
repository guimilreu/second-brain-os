"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { TransferDialog } from "@/features/finance/components/dialogs/TransferDialog";
import { TaskDialog } from "@/features/tasks/components/dialogs/TaskDialog";
import { WishlistItemDialog } from "@/features/wishlist/components/WishlistItemDialog";
import { ImportDialog } from "@/components/layout/ImportDialog";
import { useActionStore } from "@/stores/action-store";
import { addMonths, format } from "date-fns";

type Account = { id: string; name: string };
type Project = { id: string; name: string; color: string };

function buildMonthKeys(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) =>
    format(addMonths(now, i), "yyyy-MM"),
  );
}

export function GlobalActions() {
  const router = useRouter();
  const {
    transactionOpen,
    transferOpen,
    taskOpen,
    wishlistOpen,
    transactionPrefill,
    transferFromAccountId,
    closeTransaction,
    closeTransfer,
    closeTask,
    closeWishlist,
    openTransaction,
  } = useActionStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prefillRevision, setPrefillRevision] = useState(0);
  const monthKeys = buildMonthKeys();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!transactionOpen && !transferOpen && !taskOpen && !wishlistOpen) return;
    void (async () => {
      try {
        const [accRes, projRes] = await Promise.all([
          axios.get<{ data: Account[] }>("/api/finance/accounts"),
          axios.get<{ data: Project[] }>("/api/tasks/projects"),
        ]);
        setAccounts(accRes.data.data);
        setProjects(projRes.data.data);
      } catch {
        /* optional */
      }
    })();
  }, [transactionOpen, transferOpen, taskOpen, wishlistOpen]);

  useEffect(() => {
    if (transactionPrefill) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- bump revision on new prefill
      setPrefillRevision((n) => n + 1);
    }
  }, [transactionPrefill]);

  return (
    <>
      <TransactionDialog
        open={transactionOpen}
        onClose={closeTransaction}
        accounts={accounts}
        onSaved={() => {
          closeTransaction();
          refresh();
        }}
        prefilledDefaults={transactionPrefill}
        prefillRevision={prefillRevision}
      />
      <TransferDialog
        open={transferOpen}
        onClose={closeTransfer}
        onSaved={() => {
          closeTransfer();
          refresh();
        }}
        defaultFromAccountId={transferFromAccountId}
      />
      <TaskDialog
        open={taskOpen}
        onClose={closeTask}
        projects={projects}
        onSaved={() => {
          closeTask();
          refresh();
        }}
      />
      <WishlistItemDialog
        open={wishlistOpen}
        onClose={closeWishlist}
        item={null}
        monthKeys={monthKeys}
        onSaved={() => {
          closeWishlist();
          refresh();
        }}
        onPurchasedOpenFinance={(payload) => {
          openTransaction(payload);
        }}
      />
      <ImportDialog />
    </>
  );
}
