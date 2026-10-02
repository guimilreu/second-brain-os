"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCog, MoreHorizontal, Pencil, Scale } from "lucide-react";
import { toast } from "sonner";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type { Cents, DateStr, MonthKey } from "@/features/finance/domain/types";
import { reconcileInvoice, setInvoiceDates } from "@/features/finance/server/actions";
import { useAction } from "@/features/finance/components/shared/useAction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormActions, FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";

type ToolInvoice = {
  month: MonthKey;
  closingDate: DateStr;
  dueDate: DateStr;
  /** Total lançado (sem previstas): é o que o app do banco mostra. */
  totalCents: Cents;
};

type InvoiceToolsProps = {
  cardId: string;
  invoice: ToolInvoice;
  /** "Fatura de outubro" */
  label: string;
};

/** Menu "…" da fatura: ajustar datas, conferir com o banco e editar o cartão. */
export function InvoiceTools({ cardId, invoice, label }: InvoiceToolsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"dates" | "reconcile" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Ferramentas da fatura"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64"
        >
          <DropdownMenuItem onClick={() => setDialog("dates")}>
            <CalendarCog />
            Ajustar datas desta fatura
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("reconcile")}>
            <Scale />
            Conferir com o app do banco
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/accounts")}>
            <Pencil />
            Editar cartão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={dialog === "dates"}
        onClose={close}
        title="Ajustar datas"
        description={label}
        size="sm"
      >
        <InvoiceDatesForm
          cardId={cardId}
          invoice={invoice}
          onDone={close}
        />
      </Modal>

      <Modal
        open={dialog === "reconcile"}
        onClose={close}
        title="Conferir com o app do banco"
        description={label}
        size="sm"
      >
        <ReconcileForm
          cardId={cardId}
          invoice={invoice}
          onDone={close}
        />
      </Modal>
    </>
  );
}

type FormProps = {
  cardId: string;
  invoice: ToolInvoice;
  onDone: () => void;
};

function InvoiceDatesForm({ cardId, invoice, onDone }: FormProps) {
  const { pending, execute } = useAction();
  const [closingDate, setClosingDate] = useState(invoice.closingDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const invalid = Boolean(closingDate && dueDate && dueDate <= closingDate);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!closingDate || !dueDate || invalid) return;
    const ok = await execute(() => setInvoiceDates({ cardId, month: invoice.month, closingDate, dueDate }), {
      success: "Datas da fatura atualizadas.",
    });
    if (ok) onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      <p className="text-[0.8125rem] text-muted-foreground">
        Para quando o banco muda o fechamento ou o vencimento (feriado, fim de semana). As compras afetadas mudam de
        fatura sozinhas, menos as que você moveu à mão.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Fecha em">
          <Input
            type="date"
            required
            value={closingDate}
            onChange={(event) => setClosingDate(event.target.value)}
          />
        </FormField>
        <FormField
          label="Vence em"
          error={invalid ? "Precisa ser depois do fechamento." : undefined}
        >
          <Input
            type="date"
            required
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </FormField>
      </div>
      <FormActions
        onCancel={onDone}
        isLoading={pending}
        submitLabel="Salvar datas"
      />
    </form>
  );
}

function ReconcileForm({ cardId, invoice, onDone }: FormProps) {
  const { pending, execute } = useAction();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const realCents = parseMoneyInput(value);
  const diff = realCents !== null && realCents >= 0 ? realCents - invoice.totalCents : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (realCents === null || realCents < 0 || diff === null) {
      setError("Digite o total que aparece no app do banco.");
      return;
    }
    if (diff === 0) {
      toast.success("A fatura bate com o banco.");
      onDone();
      return;
    }
    const ok = await execute(
      () => reconcileInvoice({ cardId, month: invoice.month, realTotalCents: realCents }),
      { success: "Fatura ajustada." },
    );
    if (ok) onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4"
    >
      <FormField
        label="Quanto o app mostra nesta fatura?"
        hint="O total da fatura, não o limite disponível."
        error={error ?? undefined}
      >
        <Input
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
      </FormField>

      {diff !== null && realCents !== null ? (
        <div className="space-y-2 rounded-2xl border border-border bg-foreground/[0.03] p-3 text-[0.8125rem]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Aqui no app</span>
            <Money cents={invoice.totalCents} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">No banco</span>
            <Money cents={realCents} />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 font-semibold">
            <span>Diferença</span>
            <span>
              <Money cents={Math.abs(diff)} />
              {diff > 0 ? " a mais no banco" : diff < 0 ? " a menos no banco" : null}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {diff === 0
              ? "Bate certinho. Nada a ajustar."
              : diff > 0
                ? "Faltou lançar alguma coisa. Vamos lançar um ajuste nesta fatura; se souber qual compra foi, prefira lançá-la."
                : "Aqui tem a mais que no banco (compra repetida ou estorno que faltou). Vamos lançar um crédito nesta fatura."}
          </p>
        </div>
      ) : null}

      <FormActions
        onCancel={onDone}
        isLoading={pending}
        submitLabel={diff === 0 ? "Concluir" : "Lançar ajuste"}
      />
    </form>
  );
}
