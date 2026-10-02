import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { EntrySheet } from "@/features/finance/components/entry/EntrySheet";
import { CommandPalette } from "@/features/search/components/CommandPalette";
import type { ShellData } from "@/features/finance/server/shell";

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
  shell: ShellData;
};

export function AppShell({ children, userName, shell }: AppShellProps) {
  return (
    <div className="min-h-dvh">
      <Sidebar userName={userName} />
      <div className="lg:pl-[17rem]">
        <Topbar />
        <main className="mx-auto w-full max-w-[84rem] px-4 pt-4 pb-32 sm:pb-12 md:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
      <MobileNav />
      <EntrySheet shell={shell} />
      <CommandPalette shell={shell} />
    </div>
  );
}
