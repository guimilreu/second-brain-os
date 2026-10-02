import { cn } from "@/lib/utils";

export type DonutSegment = { key: string; value: number; color: string; label?: string };

type DonutRingProps = {
  segments: DonutSegment[];
  /** Espessura do anel em % do diâmetro (padrão 11). */
  thickness?: number;
  className?: string;
  children?: React.ReactNode;
};

const R = 50;

/**
 * Rosca com segmentos arredondados e espaço entre eles (estilo Pierre). Cada arco usa pathLength=100,
 * então o tamanho do segmento é o próprio percentual; a animação cresce cada arco em sequência.
 */
export function DonutRing({ segments, thickness = 11, className, children }: DonutRingProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const radius = R - thickness / 2;
  // Ponta arredondada avança meia espessura em cada lado: o espaço precisa descontar isso.
  const capUnits = (thickness / 2 / (2 * Math.PI * radius)) * 100;
  const gap = segments.length > 1 ? capUnits * 2 + 1.4 : 0;
  let start = 0;

  return (
    <div className={cn("relative aspect-square", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible">
        <circle cx={R} cy={R} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.07} strokeWidth={thickness} />
        {total > 0
          ? segments.map((segment, index) => {
              const pct = (Math.max(segment.value, 0) / total) * 100;
              const length = Math.max(pct - gap, 0.01);
              const offset = -(start + gap / 2);
              start += pct;
              return (
                <circle
                  key={segment.key}
                  cx={R}
                  cy={R}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={offset}
                  className="animate-arc"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  {segment.label ? <title>{segment.label}</title> : null}
                </circle>
              );
            })
          : null}
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center text-center">{children}</div> : null}
    </div>
  );
}
