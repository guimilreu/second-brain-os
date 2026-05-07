import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { QuickActions } from "@/components/layout/QuickActions";

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
};

export function AppShell({ children, userName }: AppShellProps) {
  return (
    <div className="soft-grid min-h-screen">
      <Sidebar userName={userName} />
      <main className="min-h-screen px-4 pb-10 pt-20 md:px-8 lg:ml-80 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-7xl">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <QuickActions />
    </div>
  );
}
