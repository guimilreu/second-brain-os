import { Brain, LockKeyhole, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/layout/LoginForm";
import { LoginHeroDecor, LoginHeroItem } from "@/components/layout/LoginHeroDecor";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className="soft-grid grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <LoginHeroDecor>
          <section className="hidden lg:block">
            <LoginHeroItem>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-md dark:bg-default-50/40">
                <Sparkles className="h-4 w-4 text-brand dark:text-primary" />
                os.gmdev.pro
              </div>
            </LoginHeroItem>
            <LoginHeroItem className="mt-8">
              <h1 className="max-w-3xl text-6xl font-semibold tracking-tight">
                Seu segundo cérebro, do seu jeito.
              </h1>
            </LoginHeroItem>
            <LoginHeroItem className="mt-6">
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Centralize financeiro, tarefas e decisões em um sistema pessoal bonito, rápido e pensado
                para evoluir com sua rotina.
              </p>
            </LoginHeroItem>
            <div className="mt-10 grid max-w-2xl gap-4 md:grid-cols-2">
              <LoginHeroItem>
                <div className="glass-surface rounded-3xl p-5 transition-shadow hover:shadow-xl">
                  <Brain className="h-7 w-7 text-brand dark:text-primary" />
                  <p className="mt-5 font-semibold">Organização real</p>
                  <p className="mt-2 text-sm text-muted-foreground">Menos abas soltas, mais clareza operacional.</p>
                </div>
              </LoginHeroItem>
              <LoginHeroItem>
                <div className="glass-surface rounded-3xl p-5 transition-shadow hover:shadow-xl">
                  <LockKeyhole className="h-7 w-7 text-brand dark:text-primary" />
                  <p className="mt-5 font-semibold">Acesso pessoal</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Login simples, sessão persistente e sem cadastro público.
                  </p>
                </div>
              </LoginHeroItem>
            </div>
          </section>
        </LoginHeroDecor>

        <LoginHeroDecor>
          <LoginHeroItem className="lg:self-start">
            <section className="glass-surface rounded-[2rem] border border-default-200/80 p-6 shadow-xl backdrop-blur-md dark:border-default-100 md:p-8">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-700 p-3 text-white shadow-lg shadow-primary/30">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Second Brain OS</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Entrar no sistema</h2>
                </div>
              </div>
              <LoginForm />
            </section>
          </LoginHeroItem>
        </LoginHeroDecor>
      </div>
    </main>
  );
}
