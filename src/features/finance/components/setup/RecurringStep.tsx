"use client";

import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { MoneyInput } from "@/features/finance/components/accounts/fields";
import type { Category } from "@/features/finance/domain/types";
import { cn } from "@/lib/utils";
import {
  defaultAccountKey,
  newDraftId,
  RECURRING_TEMPLATES,
  recurringFromTemplate,
  type DraftAccount,
  type DraftRecurring,
  type SetupDraft,
} from "./draft";

const TYPE_OPTIONS: { value: DraftRecurring["type"]; label: string }[] = [
  { value: "expense", label: "Saída" },
  { value: "income", label: "Entrada" },
];

type RecurringStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
  categories: Category[];
};

export function RecurringStep({ draft, setDraft, categories }: RecurringStepProps) {
  const added = new Set(draft.recurrings.map((item) => item.templateId));

  function addRow(row: DraftRecurring) {
    setDraft((current) => ({ ...current, recurrings: [...current.recurrings, row] }));
  }

  function update(id: string, patch: Partial<DraftRecurring>) {
    setDraft((current) => ({
      ...current,
      recurrings: current.recurrings.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function remove(id: string) {
    setDraft((current) => ({ ...current, recurrings: current.recurrings.filter((item) => item.id !== id) }));
  }

  return (
    <Panel
      title="Fixas"
      description="Entradas e contas que se repetem todo mês. Toque nos modelos e ajuste valor, dia e conta."
      padded={false}
    >
      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-4">
        {RECURRING_TEMPLATES.map((template) => {
          const isAdded = added.has(template.id);
          return (
            <button
              key={template.id}
              type="button"
              disabled={isAdded}
              onClick={() => addRow(recurringFromTemplate(template, draft.accounts, categories))}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition-colors [&_svg]:size-3.5",
                isAdded
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {isAdded ? <Check /> : <Plus />}
              {template.label}
            </button>
          );
        })}
      </div>

      {draft.recurrings.length ? (
        <ul className="divide-y divide-border">
          {draft.recurrings.map((item) => (
            <RecurringRow
              key={item.id}
              item={item}
              accounts={draft.accounts}
              categories={categories}
              onChange={(patch) => update(item.id, patch)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Nenhuma fixa ainda. Use os modelos acima ou adicione uma do zero.
        </p>
      )}

      <div className="space-y-3 border-t border-border p-4">
        <Button
          variant="outline"
          onClick={() =>
            addRow({
              id: newDraftId(),
              templateId: null,
              type: "expense",
              description: "",
              amountText: "",
              dayText: "10",
              accountKey: defaultAccountKey(draft.accounts, "operating"),
              categoryId: "",
              isEstimate: false,
              autoPost: false,
            })
          }
        >
          <Plus />
          Outra fixa
        </Button>
        <p className="text-xs text-muted-foreground">
          “Lança sozinha” entra no dia certo sem pedir confirmação, bom para assinatura no cartão. As outras aparecem
          em Hoje para você confirmar quando pagar ou receber.
        </p>
      </div>
    </Panel>
  );
}

function RecurringRow({
  item,
  accounts,
  categories,
  onChange,
  onRemove,
}: {
  item: DraftRecurring;
  accounts: DraftAccount[];
  categories: Category[];
  onChange: (patch: Partial<DraftRecurring>) => void;
  onRemove: () => void;
}) {
  const options = categories.filter((category) => category.kind === item.type);

  function changeType(type: DraftRecurring["type"]) {
    // Categoria de saída não serve para entrada (e vice-versa); entrada nunca lança sozinha no cartão.
    onChange({ type, categoryId: "", autoPost: type === "expense" ? item.autoPost : false });
  }

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <Segmented options={TYPE_OPTIONS} value={item.type} onChange={changeType} size="sm" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remover ${item.description || "fixa"}`}
          onClick={onRemove}
        >
          <X />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FormField label="Descrição" className="col-span-2">
          <Input
            value={item.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder={item.type === "income" ? "Ex.: Salário" : "Ex.: Aluguel"}
            maxLength={80}
          />
        </FormField>
        <FormField label={item.isEstimate ? "Valor (estimado)" : "Valor"}>
          <MoneyInput value={item.amountText} onValueChange={(amountText) => onChange({ amountText })} />
        </FormField>
        <FormField label="Dia">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={item.dayText}
            onChange={(event) => onChange({ dayText: event.target.value })}
            className="num"
          />
        </FormField>
        <FormField label={item.type === "income" ? "Cai em" : "Sai de"} className="sm:col-span-2">
          <Select value={item.accountKey} onChange={(event) => onChange({ accountKey: event.target.value })}>
            {accounts.map((account) => (
              <option key={account.key} value={account.key}>
                {account.name || "Conta sem nome"}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Categoria" className="sm:col-span-2">
          <Select value={item.categoryId} onChange={(event) => onChange({ categoryId: event.target.value })}>
            <option value="">Sem categoria</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium">
          <Checkbox checked={item.isEstimate} onCheckedChange={(checked) => onChange({ isEstimate: checked })} />
          Valor varia
        </label>
        {item.type === "expense" ? (
          <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] font-medium">
            <Checkbox checked={item.autoPost} onCheckedChange={(checked) => onChange({ autoPost: checked })} />
            Lança sozinha
          </label>
        ) : null}
      </div>
    </li>
  );
}
