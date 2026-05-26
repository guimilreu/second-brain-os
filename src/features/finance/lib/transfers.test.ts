import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { executeTransfer, TransferError } from "./transfers";

describe("transfers validação", () => {
  it("rejeita conta igual origem e destino", async () => {
    await expect(
      executeTransfer(new mongoose.Types.ObjectId().toString(), {
        kind: "account-to-account",
        fromAccountId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        toAccountId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        amount: 10,
        fee: 0,
        occurredAt: new Date(),
        notes: "",
        status: "confirmed",
      }),
    ).rejects.toBeInstanceOf(TransferError);
  });
});
