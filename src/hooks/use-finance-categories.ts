"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FINANCE_TRANSACTION_CATEGORIES } from "@/features/finance/lib/categories";

type ApiCategory = { id: string; name: string };

export function useFinanceCategories() {
  const [categories, setCategories] = useState<string[]>([...FINANCE_TRANSACTION_CATEGORIES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void axios
      .get<{ data: ApiCategory[] }>("/api/finance/categories")
      .then((res) => {
        if (cancelled) return;
        const names = res.data.data.map((c) => c.name);
        setCategories(names.length > 0 ? names : [...FINANCE_TRANSACTION_CATEGORIES]);
      })
      .catch(() => {
        if (!cancelled) setCategories([...FINANCE_TRANSACTION_CATEGORIES]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}
