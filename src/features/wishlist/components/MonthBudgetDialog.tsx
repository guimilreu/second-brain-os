"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { FormActions, FormField, Input, Select } from "@/components/ui/FormField";

type MonthBudgetDialogProps = {
  open: boolean;
  onClose: () => void;
  monthKeys: string[];
  selectedMonthKey: string;
  initialCap: number;
  onSaved: () => void;
};

export function MonthBudgetDialog({
  open,
  onClose,
  monthKeys,
  selectedMonthKey,
  initialCap,
  onSaved,
}: MonthBudgetDialogProps) {
  const [monthKey, setMonthKey] = useState(selectedMonthKey);
  const [capAmount, setCapAmount] = useState(initialCap > 0 ? initialCap : 0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await axios.post("/api/wishlist/month-budgets", {
        monthKey,
        capAmount: Number(capAmount),
      });
      toast.success("Teto do mês salvo.");
      onSaved();
      onClose();
    } catch {
      toast.error("Não foi possível salvar o teto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Teto da lista (mês)"
      description="Alertas quando as estimativas planejadas passarem deste valor."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Mês">
          <Select value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>
            {monthKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Teto (R$)">
          <Input
            required
            type="number"
            min={0}
            step="0.01"
            value={capAmount}
            onChange={(event) => setCapAmount(parseFloat(event.target.value) || 0)}
          />
        </FormField>
        <FormActions onCancel={onClose} isLoading={saving} />
      </form>
    </Modal>
  );
}
