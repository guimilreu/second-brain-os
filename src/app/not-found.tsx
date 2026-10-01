import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="num text-sm font-semibold text-primary-ink">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Página não encontrada</h1>
      <p className="mt-1 text-sm text-muted-foreground">O endereço pode ter mudado com a nova navegação.</p>
      <Button className="mt-6" render={<Link href="/" />}>
        Ir para Hoje
      </Button>
    </main>
  );
}
