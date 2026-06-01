import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type EntityChipProps = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
};

export function EntityChip({ href, label, icon, className, onClick }: EntityChipProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-soft/80 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft/60 hover:text-brand",
        className,
      )}
    >
      {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </Link>
  );
}
