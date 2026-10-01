import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { AppearancePanel } from "@/features/finance/components/settings/AppearancePanel";
import { CategoriesPanel } from "@/features/finance/components/settings/CategoriesPanel";
import { PreferencesPanel } from "@/features/finance/components/settings/PreferencesPanel";
import { SignOutButton } from "@/features/finance/components/settings/SignOutButton";
import { loadFinance } from "@/features/finance/server/data";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [session, finance] = await Promise.all([requireCurrentUser(), loadFinance()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Preferências, categorias, aparência e backup." />

      {/* Desktop: categorias à esquerda e o resto empilhado à direita; no mobile, Preferências vem primeiro. */}
      <div className="grid items-start gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_1fr]">
        <PreferencesPanel settings={finance.settings} className="lg:col-start-3 lg:row-start-1" />
        <CategoriesPanel categories={finance.categories} className="lg:col-[1/span_2] lg:row-[1/span_4]" />
        <AppearancePanel className="lg:col-start-3" />
        <Panel
          title="Dados"
          description="Contas, categorias, fixas e todos os lançamentos num arquivo só."
          className="lg:col-start-3"
        >
          <a href="/api/export" className={buttonVariants({ variant: "outline" })}>
            <Download />
            Exportar tudo em JSON
          </a>
        </Panel>
        <Panel title="Conta" className="lg:col-start-3">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="truncate font-semibold">{finance.userName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="truncate font-semibold">{session.email}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <SignOutButton />
          </div>
        </Panel>
      </div>
    </div>
  );
}
