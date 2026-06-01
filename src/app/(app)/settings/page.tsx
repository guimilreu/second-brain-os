import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { SettingsForm } from "@/features/settings/components/SettingsForm";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Configurações — Second Brain OS" };

export default async function SettingsPage() {
  const user = await requireCurrentUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Preferências"
        title="Configurações"
        description={`Ajustes de calendário e moeda para ${user.name.split(" ")[0]}.`}
      />
      <Reveal>
        <SettingsForm />
      </Reveal>
    </div>
  );
}
