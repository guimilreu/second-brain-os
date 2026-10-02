import { cn } from "@/lib/utils";
import { packBubbles } from "./packBubbles";

export type Bubble = {
  key: string;
  value: number;
  color: string;
  label: string;
  icon?: React.ReactNode;
  /** Texto pequeno no meio (ex.: "29%"). */
  caption?: string;
};

type BubbleCloudProps = {
  bubbles: Bubble[];
  /** largura / altura da área (padrão 1.6). */
  aspect?: number;
  className?: string;
};

/** Nuvem de bolhas: cada categoria vira um círculo do tamanho do gasto (como o "Clareza" do Pierre). */
export function BubbleCloud({ bubbles, aspect = 1.6, className }: BubbleCloudProps) {
  const placed = packBubbles(bubbles, aspect);
  const byKey = new Map(bubbles.map((bubble) => [bubble.key, bubble]));

  return (
    <div className={cn("relative w-full", className)} style={{ aspectRatio: aspect }}>
      {placed.map((spot, index) => {
        const bubble = byKey.get(spot.key)!;
        const diameter = spot.r * 2;
        const small = diameter < 0.2;
        return (
          <div
            key={spot.key}
            title={`${bubble.label}${bubble.caption ? ` · ${bubble.caption}` : ""}`}
            className="absolute grid place-items-center rounded-full animate-pop transition-transform duration-300 hover:scale-[1.06]"
            style={{
              left: `${(spot.x - spot.r / aspect) * 100}%`,
              top: `${(spot.y - spot.r) * 100}%`,
              width: `${(diameter / aspect) * 100}%`,
              height: `${diameter * 100}%`,
              background: `radial-gradient(circle at 30% 25%, color-mix(in oklch, ${bubble.color} 34%, transparent), color-mix(in oklch, ${bubble.color} 14%, transparent) 70%)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${bubble.color} 40%, transparent)`,
              color: bubble.color,
              animationDelay: `${index * 70}ms`,
            }}
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              {bubble.icon ? <span className={cn(small ? "[&_svg]:size-3" : "[&_svg]:size-4")}>{bubble.icon}</span> : null}
              {!small && bubble.caption ? (
                <span className="text-[0.75rem] font-semibold tabular-nums">{bubble.caption}</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
