type LooseInline = { type?: string; text?: string };
type LooseBlock = {
  content?: LooseInline[];
  children?: LooseBlock[];
};

function walkBlocks(blocks: LooseBlock[], parts: string[], maxChars: number) {
  for (const b of blocks) {
    if (parts.join(" ").length >= maxChars) return;
    if (Array.isArray(b.content)) {
      for (const c of b.content) {
        if (typeof c.text === "string" && c.text) {
          parts.push(c.text);
          if (parts.join(" ").length >= maxChars) return;
        }
      }
    }
    if (b.children?.length) {
      walkBlocks(b.children, parts, maxChars);
    }
  }
}

/** Extrai prévia em texto plano a partir dos blocos BlockNote (estrutura genérica). */
export function snippetFromBlocks(blocks: unknown, maxLen = 180): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return "";
  }
  const parts: string[] = [];
  walkBlocks(blocks as LooseBlock[], parts, maxLen);
  const s = parts.join(" ").replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
