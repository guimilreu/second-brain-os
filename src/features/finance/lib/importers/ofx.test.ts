import { describe, expect, it } from "vitest";
import { parseOfxContent } from "./ofx";

describe("ofx importer", () => {
  it("parses STMTTRN básico", () => {
    const xml = `
<OFX>
<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260115</DTPOSTED>
<TRNAMT>-50.00</TRNAMT>
<MEMO>Padaria</MEMO>
<FITID>1</FITID>
</STMTTRN>
</OFX>`;
    const rows = parseOfxContent(xml);
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("expense");
    expect(rows[0].amount).toBe(50);
  });
});
