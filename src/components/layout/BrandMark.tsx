import { cn } from "@/lib/utils";

/** Marca do app: quadradinho em gradiente ciano → lima com "sb" em caixa baixa. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.8rem] bg-[linear-gradient(135deg,#00d0ff_0%,#5be8ff_45%,#c6f432_100%)] text-[0.9375rem] font-bold tracking-[-0.06em] text-[#03161d] shadow-[0_8px_24px_-8px_rgba(0,208,255,0.7)]",
        className,
      )}
      aria-hidden
    >
      sb
    </span>
  );
}
