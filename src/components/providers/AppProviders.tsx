"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { MotionRoot } from "@/components/providers/MotionRoot";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MotionRoot>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </ThemeProvider>
    </MotionRoot>
  );
}
