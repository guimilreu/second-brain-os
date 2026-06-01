"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="paper-note mx-auto max-w-lg rounded-[1.75rem] p-8 text-center">
      <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">
        Algo deu errado
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente novamente.
      </p>
      <Button className="mt-6" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
