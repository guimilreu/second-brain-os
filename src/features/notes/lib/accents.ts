import type { NoteAccent } from "@/lib/note-accents";
import { NOTE_ACCENTS } from "@/lib/note-accents";

export const NOTE_ACCENT_META: Record<
  NoteAccent,
  {
    label: string;
    bar: string;
    ring: string;
    /** Card na lista (não selecionado) */
    listCard: string;
    /** Card na lista selecionado */
    listCardActive: string;
  }
> = {
  default: {
    label: "Neutro",
    bar: "bg-muted-foreground/50",
    ring: "ring-muted-foreground/30",
    listCard: "border-border/80 bg-card/80 hover:bg-muted/35",
    listCardActive: "border-brand/40 bg-brand/18 ring-2 ring-brand/35",
  },
  amber: {
    label: "Âmbar",
    bar: "bg-amber-500",
    ring: "ring-amber-400/50",
    listCard:
      "border-amber-500/40 bg-amber-500/[0.14] hover:bg-amber-500/20 dark:border-amber-400/35 dark:bg-amber-500/12",
    listCardActive:
      "border-amber-500/55 bg-amber-500/24 ring-2 ring-amber-400/50 dark:bg-amber-500/22",
  },
  rose: {
    label: "Rosa",
    bar: "bg-rose-500",
    ring: "ring-rose-400/50",
    listCard:
      "border-rose-500/40 bg-rose-500/[0.14] hover:bg-rose-500/20 dark:border-rose-400/35 dark:bg-rose-500/12",
    listCardActive: "border-rose-500/55 bg-rose-500/24 ring-2 ring-rose-400/50 dark:bg-rose-500/22",
  },
  sky: {
    label: "Céu",
    bar: "bg-sky-500",
    ring: "ring-sky-400/50",
    listCard:
      "border-sky-500/40 bg-sky-500/[0.14] hover:bg-sky-500/20 dark:border-sky-400/35 dark:bg-sky-500/12",
    listCardActive: "border-sky-500/55 bg-sky-500/24 ring-2 ring-sky-400/50 dark:bg-sky-500/22",
  },
  violet: {
    label: "Violeta",
    bar: "bg-violet-500",
    ring: "ring-violet-400/50",
    listCard:
      "border-violet-500/40 bg-violet-500/[0.14] hover:bg-violet-500/20 dark:border-violet-400/35 dark:bg-violet-500/12",
    listCardActive:
      "border-violet-500/55 bg-violet-500/24 ring-2 ring-violet-400/50 dark:bg-violet-500/22",
  },
  emerald: {
    label: "Esmeralda",
    bar: "bg-emerald-500",
    ring: "ring-emerald-400/50",
    listCard:
      "border-emerald-500/40 bg-emerald-500/[0.14] hover:bg-emerald-500/20 dark:border-emerald-400/35 dark:bg-emerald-500/12",
    listCardActive:
      "border-emerald-500/55 bg-emerald-500/24 ring-2 ring-emerald-400/50 dark:bg-emerald-500/22",
  },
  slate: {
    label: "Ardósia",
    bar: "bg-slate-500",
    ring: "ring-slate-400/50",
    listCard:
      "border-slate-500/40 bg-slate-500/[0.14] hover:bg-slate-500/20 dark:border-slate-400/35 dark:bg-slate-500/12",
    listCardActive:
      "border-slate-500/55 bg-slate-500/24 ring-2 ring-slate-400/50 dark:bg-slate-500/22",
  },
};

export const NOTE_ACCENT_OPTIONS = NOTE_ACCENTS.map((value) => ({
  value,
  ...NOTE_ACCENT_META[value],
}));
