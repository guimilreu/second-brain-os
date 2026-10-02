export type BubbleInput = { key: string; value: number };
export type PlacedBubble = { key: string; x: number; y: number; r: number };

/**
 * Empacota círculos (área ∝ valor) o mais perto possível do centro, em espiral, sem sobrepor.
 * Determinístico e barato (até ~12 bolhas). Devolve posições normalizadas 0–1 na caixa `aspect` (w/h).
 */
export function packBubbles(items: BubbleInput[], aspect: number, gap = 0.012): PlacedBubble[] {
  const sorted = [...items].filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return [];
  const max = sorted[0].value;
  const placed: PlacedBubble[] = [];
  for (const item of sorted) {
    const r = 0.5 * Math.sqrt(item.value / max);
    if (!placed.length) {
      placed.push({ key: item.key, x: 0, y: 0, r });
      continue;
    }
    let best: PlacedBubble | null = null;
    for (let step = 0; step < 1400 && !best; step += 1) {
      const angle = step * 0.37;
      const dist = 0.006 * step;
      const x = Math.cos(angle) * dist * aspect;
      const y = Math.sin(angle) * dist;
      if (placed.every((other) => Math.hypot(other.x - x, other.y - y) >= other.r + r + gap)) {
        best = { key: item.key, x, y, r };
      }
    }
    if (best) placed.push(best);
  }
  // Enquadra o conjunto na caixa (largura `aspect`, altura 1) mantendo a proporção.
  const minX = Math.min(...placed.map((b) => b.x - b.r));
  const maxX = Math.max(...placed.map((b) => b.x + b.r));
  const minY = Math.min(...placed.map((b) => b.y - b.r));
  const maxY = Math.max(...placed.map((b) => b.y + b.r));
  const scale = Math.min(aspect / (maxX - minX), 1 / (maxY - minY));
  const offsetX = (aspect - (maxX - minX) * scale) / 2;
  const offsetY = (1 - (maxY - minY) * scale) / 2;
  return placed.map((b) => ({
    key: b.key,
    x: ((b.x - minX) * scale + offsetX) / aspect,
    y: (b.y - minY) * scale + offsetY,
    r: b.r * scale,
  }));
}
