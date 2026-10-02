import Link from "next/link";
import { ChevronRight, CreditCard, Gauge, Repeat, Settings, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

const LINKS = [
  { href: "/accounts", label: "Contas e cofres", description: "Saldos, cofres e conferência com os apps", icon: Wallet },
  { href: "/cards", label: "Cartão", description: "Faturas, datas de fechamento e parcelamentos", icon: CreditCard },
  { href: "/recurring", label: "Fixas", description: "Entradas e contas que se repetem", icon: Repeat },
  { href: "/settings", label: "Configurações", description: "CDI, categorias e aparência", icon: Settings },
  { href: "/", label: "Hoje", description: "Quanto ainda pode gastar e o que pede atenção", icon: Gauge },
];

/** /setup depois que já existem contas: aponta para onde cada coisa se ajusta agora. */
export function SetupDone() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuração inicial" />
      <Panel
        title="Configuração já feita"
        description="Suas contas já existem. Para mudar algo, vá direto na tela da área."
        padded={false}
      >
        <ul className="divide-y divide-border">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-foreground/[0.03] focus-visible:bg-muted/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{link.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{link.description}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
