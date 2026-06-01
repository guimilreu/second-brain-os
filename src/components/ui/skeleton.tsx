import { cn } from "@/lib/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-gradient-to-r from-muted/45 via-muted/25 to-muted/45 bg-[length:200%_100%] animate-skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
