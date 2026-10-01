"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
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
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="grid size-11 place-items-center rounded-lg bg-negative/12 text-negative">
        <AlertTriangle className="size-5" />
      </div>
      <h1 className="mt-4 text-lg font-bold tracking-tight">Não foi possível carregar esta página</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pode ter sido uma falha momentânea de conexão. Tente de novo.
      </p>
      <Button className="mt-6" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
