"use client";

import { Input } from "@/components/ui/FormField";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { INSTITUTION_LABELS, KIND_LABELS, PURPOSE_LABELS } from "@/features/finance/domain/labels";
import { parseMoneyInput } from "@/features/finance/domain/money";
import {
  ACCOUNT_KINDS,
  ACCOUNT_PURPOSES,
  INSTITUTIONS,
  type AccountKind,
  type AccountPurpose,
  type Institution,
} from "@/features/finance/domain/types";
import { cn } from "@/lib/utils";
import { centsToInput } from "@/lib/utils/format";
import { KIND_ICONS } from "./presets";

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "size"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Valor em reais digitado em pt-BR; formata ao sair do campo ("1234,5" → "1.234,50"). */
export function MoneyInput({ value, onValueChange, className, onFocus, onBlur, ...props }: TextInputProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[0.8125rem] text-muted-foreground"
        aria-hidden
      >
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.select();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          const cents = parseMoneyInput(value);
          if (cents !== null) onValueChange(centsToInput(cents));
          onBlur?.(event);
        }}
        className={cn("num pl-9", className)}
      />
    </div>
  );
}

export function PercentInput({ value, onValueChange, className, ...props }: TextInputProps) {
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("num pr-8", className)}
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[0.8125rem] text-muted-foreground"
        aria-hidden
      >
        %
      </span>
    </div>
  );
}

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  /** Chips numa linha que quebra, em vez de cartões em grade. */
  compact?: boolean;
};

/** Opções clicáveis com área de toque grande para escolhas de formulário. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  compact = false,
}: ChoiceGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn(compact ? "flex flex-wrap gap-2" : "grid gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              compact ? "h-10 px-2.5" : "min-h-11 px-3 py-2",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.icon ? <span className="flex shrink-0">{option.icon}</span> : null}
            <span className="min-w-0">
              <span className="block text-[0.8125rem] leading-tight font-semibold">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const KIND_DESCRIPTIONS: Record<AccountKind, string> = {
  checking: "Saldo no banco",
  pocket: "Dinheiro à parte",
  credit_card: "Fatura todo mês",
  cash: "Em espécie",
};

export function KindChoice({
  value,
  onChange,
  isDisabled,
}: {
  value: AccountKind;
  onChange: (kind: AccountKind) => void;
  isDisabled?: (kind: AccountKind) => boolean;
}) {
  return (
    <ChoiceGroup
      label="Tipo"
      className="grid-cols-2"
      value={value}
      onChange={onChange}
      options={ACCOUNT_KINDS.map((kind) => {
        const Icon = KIND_ICONS[kind];
        return {
          value: kind,
          label: KIND_LABELS[kind],
          description: KIND_DESCRIPTIONS[kind],
          icon: <Icon className="size-4" />,
          disabled: isDisabled?.(kind),
        };
      })}
    />
  );
}

export function InstitutionChoice({
  value,
  onChange,
}: {
  value: Institution;
  onChange: (institution: Institution) => void;
}) {
  return (
    <ChoiceGroup
      label="Instituição"
      compact
      value={value}
      onChange={onChange}
      options={INSTITUTIONS.map((institution) => ({
        value: institution,
        label: INSTITUTION_LABELS[institution],
        icon: <InstitutionMark institution={institution} name={INSTITUTION_LABELS[institution]} size="sm" />,
      }))}
    />
  );
}

const PURPOSE_DESCRIPTIONS: Record<AccountPurpose, string> = {
  operating: "Daqui saem os pagamentos",
  card_reserve: "Junta o valor da fatura",
  goal: "Juntar para algo",
  savings: "Reserva sem prazo",
};

export function PurposeChoice({
  value,
  onChange,
}: {
  value: AccountPurpose | null;
  onChange: (purpose: AccountPurpose) => void;
}) {
  return (
    <ChoiceGroup
      label="Papel do cofrinho"
      className="grid-cols-2"
      value={value}
      onChange={onChange}
      options={ACCOUNT_PURPOSES.map((purpose) => ({
        value: purpose,
        label: PURPOSE_LABELS[purpose],
        description: PURPOSE_DESCRIPTIONS[purpose],
      }))}
    />
  );
}

/** Ícone do tipo de conta tingido com a cor dela. */
export function AccountIcon({
  kind,
  color,
  size = "md",
  className,
}: {
  kind: AccountKind;
  color: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = KIND_ICONS[kind];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        size === "sm" ? "size-7 rounded-md [&_svg]:size-3.5" : "size-9 rounded-lg [&_svg]:size-4",
        className,
      )}
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden
    >
      <Icon />
    </span>
  );
}
