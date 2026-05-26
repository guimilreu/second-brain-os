export type ParsedOfxTransaction = {
  occurredAt: Date;
  amount: number;
  title: string;
  type: "income" | "expense";
  externalId?: string;
};

/** Parser mínimo OFX: extrai STMTTRN */
export function parseOfxContent(content: string): ParsedOfxTransaction[] {
  const out: ParsedOfxTransaction[] = [];
  const block = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let m: RegExpExecArray | null;
  while ((m = block.exec(content)) !== null) {
    const chunk = m[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}>([^<\\n]+)`).exec(chunk);
      return r?.[1]?.trim();
    };
    const trnType = get("TRNTYPE");
    const dt = get("DTPOSTED") ?? get("DTUSER");
    const amtRaw = get("TRNAMT");
    const memo = get("MEMO") ?? get("NAME") ?? "Importado OFX";
    const fitId = get("FITID");
    if (!dt || !amtRaw) continue;
    const y = Number(dt.slice(0, 4));
    const mo = Number(dt.slice(4, 6)) - 1;
    const d = Number(dt.slice(6, 8));
    const amount = Math.abs(Number(amtRaw));
    const isExpense = trnType === "DEBIT" || Number(amtRaw) < 0;
    out.push({
      occurredAt: new Date(y, mo, d),
      amount,
      title: memo,
      type: isExpense ? "expense" : "income",
      externalId: fitId,
    });
  }
  return out;
}
