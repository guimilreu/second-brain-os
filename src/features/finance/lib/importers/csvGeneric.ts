export type CsvRow = Record<string, string>;

/** CSV genérico: primeira linha cabeçalho, colunas data, valor, descrição */
export function parseCsvGeneric(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").length > 1 ? lines[0].split(";") : lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.includes(";") ? line.split(";") : line.split(",");
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cells[i] ?? "").trim();
    });
    return row;
  });
}
