import { LoginForm } from "@/components/layout/LoginForm";

export const metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-40 size-[36rem] rounded-full bg-primary-foreground/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary-foreground text-xs font-extrabold text-primary-ink">
            SB
          </span>
          <span className="font-bold tracking-tight">Second Brain</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-4xl leading-tight font-bold tracking-tight text-balance">
            Seu dinheiro, claro o bastante para decidir em segundos.
          </p>
          <p className="mt-4 text-primary-foreground/75">
            Saldos, recorrências, cartões, metas e previsão do mês num só lugar.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/60">gm.socialsell.ai</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
