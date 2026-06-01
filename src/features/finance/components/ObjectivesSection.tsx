"use client";

import { GoalsSection } from "@/features/finance/components/GoalsSection";
import { SavingsPotsSection } from "@/features/finance/components/SavingsPotsSection";

export function ObjectivesSection() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-heading mb-4 text-xl font-bold tracking-[-0.03em]">
          Cofrinhos
        </h2>
        <SavingsPotsSection />
      </section>
      <section>
        <h2 className="font-heading mb-4 text-xl font-bold tracking-[-0.03em]">
          Metas com prazo
        </h2>
        <GoalsSection />
      </section>
    </div>
  );
}
