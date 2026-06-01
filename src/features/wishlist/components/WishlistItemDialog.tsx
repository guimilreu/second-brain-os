"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  FormActions,
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { FINANCE_TRANSACTION_CATEGORIES } from "@/features/finance/lib/categories";
import type { WishlistOverviewItem } from "@/features/wishlist/lib/types";

type LinkOption = { id: string; label: string };

type WishlistItemDialogProps = {
  open: boolean;
  onClose: () => void;
  item: WishlistOverviewItem | null;
  monthKeys: string[];
  onSaved: () => void;
  onPurchasedOpenFinance?: (payload: {
    wishlistItemId: string;
    title: string;
    amount: number;
    category: string;
    notes?: string;
  }) => void;
  onPurchasedOpenInstallment?: (payload: {
    wishlistItemId: string;
    title: string;
    totalAmount: number;
    category: string;
    notes?: string;
  }) => void;
};

export function WishlistItemDialog({
  open,
  onClose,
  item,
  monthKeys,
  onSaved,
  onPurchasedOpenFinance,
  onPurchasedOpenInstallment,
}: WishlistItemDialogProps) {
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Outro");
  const [lane, setLane] = useState<string>("dream");
  const [plannedMonthKey, setPlannedMonthKey] = useState("");
  const [status, setStatus] = useState<string>("idea");
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [actualPrice, setActualPrice] = useState<number | "">("");
  const [savingsPotId, setSavingsPotId] = useState("");
  const [financialGoalId, setFinancialGoalId] = useState("");
  const [openFinanceAfter, setOpenFinanceAfter] = useState(false);
  const [openInstallmentAfter, setOpenInstallmentAfter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pots, setPots] = useState<LinkOption[]>([]);
  const [goals, setGoals] = useState<LinkOption[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const [potsRes, goalsRes] = await Promise.all([
          axios.get<{ data: { id: string; name: string }[] }>("/api/finance/savings-pots"),
          axios.get<{ data: { id: string; name: string }[] }>("/api/finance/goals"),
        ]);
        setPots(potsRes.data.data.map((row) => ({ id: row.id, label: row.name })));
        setGoals(goalsRes.data.data.map((row) => ({ id: row.id, label: row.name })));
      } catch {
        /* optional pickers */
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- campos são resetados quando o modal abre ou o item muda */
    if (item) {
      setTitle(item.title);
      setNotes(item.notes ?? "");
      setUrl(item.url ?? "");
      setCategory(item.category);
      setLane(item.lane);
      setPlannedMonthKey(item.plannedMonthKey ?? "");
      setStatus(item.status);
      setEstimatedPrice(Number(item.estimatedPrice ?? 0));
      setActualPrice(
        item.actualPrice !== undefined && item.actualPrice !== null
          ? Number(item.actualPrice)
          : "",
      );
      setSavingsPotId(item.savingsPotId ?? "");
      setFinancialGoalId(item.financialGoalId ?? "");
    } else {
      setTitle("");
      setNotes("");
      setUrl("");
      setCategory("Outro");
      setLane("dream");
      setPlannedMonthKey(monthKeys[0] ?? "");
      setStatus("idea");
      setEstimatedPrice(0);
      setActualPrice("");
      setSavingsPotId("");
      setFinancialGoalId("");
    }
    setOpenFinanceAfter(true);
    setOpenInstallmentAfter(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, item, monthKeys]);

  async function handleDelete() {
    if (!item?.id) return;
    const ok = await confirm({
      title: "Remover desejo?",
      description: "O item será excluído permanentemente da lista.",
      destructive: true,
      confirmLabel: "Remover",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await axios.delete(`/api/wishlist/items/${item.id}`);
      toast.success("Item removido.");
      onSaved();
      onClose();
    } catch {
      toast.error("Não foi possível remover o item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title,
        notes,
        url,
        category,
        lane,
        status,
        estimatedPrice: Number(estimatedPrice),
        savingsPotId: savingsPotId || null,
        financialGoalId: financialGoalId || null,
      };

      if (lane === "planned") {
        payload.plannedMonthKey = plannedMonthKey || monthKeys[0];
      } else if (lane === "dream") {
        payload.plannedMonthKey = null;
      }

      if (status === "purchased") {
        const real =
          typeof actualPrice === "number" ? actualPrice : Number(actualPrice);
        if (!real || Number.isNaN(real)) {
          toast.error("Informe o valor real pago.");
          setSaving(false);
          return;
        }
        payload.actualPrice = real;
        payload.lane = "archive";
      }

      if (status === "cancelled") {
        payload.lane = "archive";
      }

      let savedItemId = item?.id;

      if (item?.id) {
        await axios.patch(`/api/wishlist/items/${item.id}`, payload);
        toast.success("Item atualizado.");
      } else {
        const res = await axios.post<{ data: { id: string } }>(
          "/api/wishlist/items",
          payload,
        );
        savedItemId = res.data.data.id;
        toast.success("Item criado.");
      }

      onSaved();
      onClose();

      if (status === "purchased" && savedItemId) {
        const real =
          typeof actualPrice === "number" ? actualPrice : Number(actualPrice);
        const purchasePayload = {
          wishlistItemId: savedItemId,
          title,
          amount: real,
          totalAmount: real,
          category,
          notes: notes ? `Lista de desejos: ${notes}` : "Lista de desejos",
        };

        if (openInstallmentAfter && onPurchasedOpenInstallment) {
          onPurchasedOpenInstallment(purchasePayload);
        } else if (openFinanceAfter && onPurchasedOpenFinance) {
          onPurchasedOpenFinance(purchasePayload);
        }
      }
    } catch {
      toast.error("Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Editar desejo" : "Novo desejo"}
      description={
        item
          ? "Atualize estimativa, status ou compra."
          : "Título e preço estimado bastam — arraste no board para planejar."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Título" className="sm:col-span-2">
          <Input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="O que você quer comprar?"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Categoria">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              {FINANCE_TRANSACTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
          {item ? (
            <>
              <FormField label="Status">
                <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="idea">Ideia</option>
                  <option value="researching">Pesquisando</option>
                  <option value="ready">Pronto pra comprar</option>
                  <option value="purchased">Comprei</option>
                  <option value="cancelled">Cancelado</option>
                </Select>
              </FormField>
              {lane === "planned" ? (
                <FormField label="Mês">
                  <Select
                    value={plannedMonthKey || monthKeys[0]}
                    onChange={(event) => setPlannedMonthKey(event.target.value)}
                  >
                    {monthKeys.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </Select>
                </FormField>
              ) : null}
            </>
          ) : null}
          <FormField label="Preço estimado (R$)">
            <Input
              required
              type="number"
              min={0}
              step="0.01"
              value={estimatedPrice}
              onChange={(event) =>
                setEstimatedPrice(parseFloat(event.target.value) || 0)
              }
            />
          </FormField>
          {status === "purchased" ? (
            <FormField label="Valor real pago (R$)">
              <Input
                required
                type="number"
                min={0}
                step="0.01"
                value={actualPrice}
                onChange={(event) =>
                  setActualPrice(parseFloat(event.target.value) || "")
                }
              />
            </FormField>
          ) : null}
          <FormField label="Cofrinho (opcional)">
            <Select
              value={savingsPotId}
              onChange={(event) => setSavingsPotId(event.target.value)}
            >
              <option value="">Nenhum</option>
              {pots.map((pot) => (
                <option key={pot.id} value={pot.id}>
                  {pot.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Meta financeira (opcional)">
            <Select
              value={financialGoalId}
              onChange={(event) => setFinancialGoalId(event.target.value)}
            >
              <option value="">Nenhuma</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Link (opcional)">
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Notas">
          <Textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
        {status === "purchased" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="open-finance"
                checked={openFinanceAfter && !openInstallmentAfter}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setOpenFinanceAfter(next);
                  if (next) setOpenInstallmentAfter(false);
                }}
              />
              <Label htmlFor="open-finance" className="cursor-pointer text-sm">
                Registrar no Financeiro após salvar
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="open-installment"
                checked={openInstallmentAfter}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setOpenInstallmentAfter(next);
                  if (next) setOpenFinanceAfter(false);
                }}
              />
              <Label htmlFor="open-installment" className="cursor-pointer text-sm">
                Comprei parcelado
              </Label>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {item ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:text-danger"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          ) : (
            <span />
          )}
          <FormActions onCancel={onClose} isLoading={saving} submitLabel="Salvar" />
        </div>
      </form>
    </Modal>
  );
}
