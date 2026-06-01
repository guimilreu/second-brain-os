"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { MotionRoot } from "@/components/providers/MotionRoot";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MotionRoot>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <ConfirmProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ConfirmProvider>
      </ThemeProvider>
    </MotionRoot>
  );
}
