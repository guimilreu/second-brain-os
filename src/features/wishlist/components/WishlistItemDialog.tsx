"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
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
import { FINANCE_TRANSACTION_CATEGORIES } from "@/features/finance/lib/categories";
import type { WishlistOverviewItem } from "@/features/wishlist/lib/types";

type WishlistItemDialogProps = {
  open: boolean;
  onClose: () => void;
  item: WishlistOverviewItem | null;
  monthKeys: string[];
  onSaved: () => void;
  onPurchasedOpenFinance?: (payload: {
    title: string;
    amount: number;
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
}: WishlistItemDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("Outro");
  const [lane, setLane] = useState<string>("dream");
  const [plannedMonthKey, setPlannedMonthKey] = useState("");
  const [status, setStatus] = useState<string>("idea");
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [actualPrice, setActualPrice] = useState<number | "">("");
  const [openFinanceAfter, setOpenFinanceAfter] = useState(false);
  const [saving, setSaving] = useState(false);

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
    }
    setOpenFinanceAfter(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, item, monthKeys]);

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

      if (item?.id) {
        await axios.patch(`/api/wishlist/items/${item.id}`, payload);
        toast.success("Item atualizado.");
      } else {
        await axios.post("/api/wishlist/items", payload);
        toast.success("Item criado.");
      }

      onSaved();
      onClose();

      if (
        status === "purchased" &&
        openFinanceAfter &&
        onPurchasedOpenFinance
      ) {
        const real =
          typeof actualPrice === "number" ? actualPrice : Number(actualPrice);
        onPurchasedOpenFinance({
          title,
          amount: real,
          category,
          notes: notes ? `Lista de desejos: ${notes}` : "Lista de desejos",
        });
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
      title={item ? "Editar desejo" : "Novo item"}
      description="Planeje compras conscientes com estimativa e mês-alvo."
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
          <FormField label="Faixa / lane">
            <Select value={lane} onChange={(event) => setLane(event.target.value)}>
              <option value="dream">Sonhos</option>
              <option value="planned">Planejado (mês)</option>
              <option value="archive">Arquivo</option>
            </Select>
          </FormField>
          {lane === "planned" ? (
            <FormField label="Mês (YYYY-MM)">
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
          <FormField label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="idea">Ideia</option>
              <option value="researching">Pesquisando</option>
              <option value="ready">Pronto pra comprar</option>
              <option value="purchased">Comprei</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </FormField>
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
          <div className="flex items-center gap-2">
            <Checkbox
              id="open-finance"
              checked={openFinanceAfter}
              onCheckedChange={(checked) => setOpenFinanceAfter(checked === true)}
            />
            <Label htmlFor="open-finance" className="cursor-pointer text-sm">
              Abrir lançamento no Financeiro (pré-preenchido, opcional)
            </Label>
          </div>
        ) : null}
        <FormActions onCancel={onClose} isLoading={saving} submitLabel="Salvar" />
      </form>
    </Modal>
  );
}
