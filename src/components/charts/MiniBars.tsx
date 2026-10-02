import { cn } from "@/lib/utils";

export type MiniBarGroup = {
  key: string;
  label: string;
  /** Uma ou duas séries por grupo (ex.: entradas e saídas). */
  values: { value: number; color: string; title: string }[];
  highlight?: boolean;
};

/** Mini barras agrupadas por período, para tendência (meses, faturas). */
export function MiniBars({ groups, className, height = "h-28" }: { groups: MiniBarGroup[]; className?: string; height?: string }) {
  const max = Math.max(...groups.flatMap((group) => group.values.map((item) => item.value)), 1);
  return (
    <div className={cn("flex items-end gap-2", height, className)}>
      {groups.map((group, groupIndex) => (
        <div key={group.key} className="flex h-full flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            {group.values.map((item, index) => (
              <span
                key={index}
                title={item.title}
                className="w-full max-w-4 origin-bottom rounded-full animate-grow"
                style={{
                  height: `${item.value > 0 ? Math.max((item.value / max) * 100, 4) : 2}%`,
                  backgroundColor: item.color,
                  opacity: group.highlight === false ? 0.45 : 1,
                  animationDelay: `${groupIndex * 70 + index * 30}ms`,
                }}
              />
            ))}
          </div>
          <span className={cn("text-[0.6875rem] capitalize", group.highlight ? "font-semibold text-foreground" : "text-muted-foreground")}>
            {group.label}
          </span>
        </div>
      ))}
    </div>
  );
}
