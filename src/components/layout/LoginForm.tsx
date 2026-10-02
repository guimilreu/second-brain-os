"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/FormField";

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      if (!response.ok) {
        toast.error(
          response.status === 401
            ? "E-mail ou senha incorretos."
            : "O servidor não conseguiu entrar agora. Tente de novo em instantes.",
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      toast.error("Sem conexão com o servidor. Confira sua internet.");
      setIsSubmitting(false);
      return;
    }

    // Carga completa: uma requisição só, já com o cookie da sessão e sem o cache do roteador de antes do login.
    window.location.assign("/");
  }

  return (
    // POST: enviado antes de o JS carregar, o navegador não põe e-mail e senha na URL (nem nos logs).
    <form onSubmit={handleSubmit} method="post" className="space-y-6">
      <div className="flex items-center gap-2.5 lg:hidden">
        <BrandMark />
        <span className="text-[0.9375rem] font-semibold tracking-tight">Second Brain</span>
      </div>

      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entre com o e-mail e a senha da sua conta.</p>
      </div>

      <div className="space-y-4">
        <FormField label="E-mail">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            required
            className="h-12"
          />
        </FormField>

        <FormField label="Senha">
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-12 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}
