import { cn } from "@/lib/utils";

type PanelProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** false remove o padding do corpo — útil para listas/tabelas que vão de borda a borda. */
  padded?: boolean;
};

export function Panel({ title, description, actions, children, className, padded = true }: PanelProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <section className={cn("tile overflow-hidden", className)}>
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6">
          <div className="min-w-0">
            {title ? <h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-[0.8125rem] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(padded ? (hasHeader ? "px-5 pt-4 pb-5 md:px-6 md:pb-6" : "p-5 md:p-6") : hasHeader && "pt-3")}>
        {children}
      </div>
    </section>
  );
}
