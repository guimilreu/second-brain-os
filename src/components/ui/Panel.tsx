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
  return (
    <section className={cn("rounded-xl border border-border bg-card shadow-xs", className)}>
      {title || actions ? (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-[0.9375rem] font-bold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}
