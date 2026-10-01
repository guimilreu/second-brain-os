"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ConfirmProvider>
        {children}
        <Toaster position="bottom-right" closeButton toastOptions={{ className: "font-sans" }} />
      </ConfirmProvider>
    </ThemeProvider>
  );
}
