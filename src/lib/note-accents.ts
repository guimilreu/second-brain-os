export const NOTE_ACCENTS = [
  "default",
  "amber",
  "rose",
  "sky",
  "violet",
  "emerald",
  "slate",
] as const;

export type NoteAccent = (typeof NOTE_ACCENTS)[number];
