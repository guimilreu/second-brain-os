import type { Institution } from "@/features/finance/domain/types";
import { cn } from "@/lib/utils";

const BRANDS: Record<Institution, { label: string; background: string; foreground: string }> = {
  mercadopago: { label: "MP", background: "#009ee3", foreground: "#ffffff" },
  nubank: { label: "Nu", background: "#820ad1", foreground: "#ffffff" },
  inter: { label: "In", background: "#ff7a00", foreground: "#ffffff" },
  other: { label: "", background: "#64748b", foreground: "#ffffff" },
};

type InstitutionMarkProps = {
  institution: Institution;
  /** Para "other": iniciais derivadas do nome da conta. */
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "size-6 rounded-md text-[0.625rem]",
  md: "size-8 rounded-lg text-xs",
  lg: "size-10 rounded-xl text-sm",
} as const;

/** Selo da instituição com a cor da marca — reconhecível de relance nas listas. */
export function InstitutionMark({ institution, name, size = "md", className }: InstitutionMarkProps) {
  const brand = BRANDS[institution];
  const label = brand.label || (name ?? "?").slice(0, 2).toUpperCase();
  return (
    <span
      className={cn("grid shrink-0 place-items-center font-extrabold tracking-tight", SIZES[size], className)}
      style={{ backgroundColor: brand.background, color: brand.foreground }}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function institutionColor(institution: Institution) {
  return BRANDS[institution].background;
}
