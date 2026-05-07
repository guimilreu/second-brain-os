import { AppShell } from "@/components/layout/AppShell";
import { requireCurrentUser } from "@/lib/auth/current-user";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  return <AppShell userName={user.name}>{children}</AppShell>;
}
