"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </ThemeProvider>
  );
}
