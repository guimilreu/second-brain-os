"use client";

import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readStoredHideValues, useUiStore } from "@/stores/ui-store";

export function PrivacyToggle({ size = "icon" }: { size?: "icon" | "icon-sm" }) {
  const hideValues = useUiStore((state) => state.hideValues);
  const setHideValues = useUiStore((state) => state.setHideValues);

  useEffect(() => {
    if (readStoredHideValues()) setHideValues(true);
  }, [setHideValues]);

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => setHideValues(!hideValues)}
      aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
      aria-pressed={hideValues}
      title={hideValues ? "Mostrar valores" : "Ocultar valores"}
    >
      {hideValues ? <EyeOff /> : <Eye />}
    </Button>
  );
}
