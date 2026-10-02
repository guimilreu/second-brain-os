"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <ConfirmProvider>
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          theme="system"
          toastOptions={{ className: "font-sans !rounded-2xl !border-border !bg-popover !text-popover-foreground !shadow-lg" }}
        />
      </ConfirmProvider>
    </ThemeProvider>
  );
}
