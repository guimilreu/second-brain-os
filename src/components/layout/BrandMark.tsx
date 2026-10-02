import { useId } from "react";
import { cn } from "@/lib/utils";
import { BRAIN_DOT, BRAIN_PATHS } from "./brainMark";

/** Marca do app: cérebro em traço neon (ciano → lima) com um gráfico subindo no hemisfério direito. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-9 shrink-0 overflow-visible drop-shadow-[0_6px_18px_rgba(0,208,255,0.35)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`brand-g-${id}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#00d0ff" />
          <stop offset="1" stopColor="#c6f432" />
        </linearGradient>
        <radialGradient id={`brand-bg-${id}`} cx="0.3" cy="0.15" r="1.1">
          <stop offset="0" stopColor="#16323d" />
          <stop offset="0.65" stopColor="#0c0e11" />
        </radialGradient>
        <filter id={`brand-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="14" fill={`url(#brand-bg-${id})`} stroke="rgba(255,255,255,0.14)" />
      <g fill="none" stroke={`url(#brand-g-${id})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <g filter={`url(#brand-glow-${id})`} opacity="0.7">
          {BRAIN_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {BRAIN_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <circle {...BRAIN_DOT} fill="#c6f432" />
    </svg>
  );
}
