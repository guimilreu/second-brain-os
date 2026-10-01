"use client";

import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Não foi possível sair. Tente de novo.");
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={() => void handleSignOut()} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Sair
    </Button>
  );
}
