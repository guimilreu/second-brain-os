import { cn } from "@/lib/utils";

export const CHIP_ACTIVE = "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40";
export const CHIP_IDLE = "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground";

type ChipProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
};

/** Opção de toque rápido (categoria, data, meio de pagamento). */
export function Chip({ active, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[0.8125rem] font-semibold transition-colors",
        active ? CHIP_ACTIVE : CHIP_IDLE,
        className,
      )}
    >
      {children}
    </button>
  );
}
