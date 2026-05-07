"use client";

import { Brain, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { springUI } from "@/lib/motion/spring";

const formGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.075,
      delayChildren: 0.06,
    },
  },
};

const formRow = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springUI,
  },
};

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Não foi possível entrar. Confira e-mail e senha.");
      return;
    }

    toast.success("Bem-vindo de volta.");
    router.push("/");
    router.refresh();
  }

  return (
    <motion.form
      variants={formGroup}
      initial="hidden"
      animate="visible"
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <motion.div variants={formRow} className="flex flex-col items-center gap-2 text-center">
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={springUI}
          className="flex items-center justify-center rounded-2xl border border-border bg-surface-soft p-3 text-foreground"
        >
          <Brain className="h-6 w-6" aria-hidden />
        </motion.div>
        <span className="text-sm font-medium text-muted-foreground">Entrar</span>
      </motion.div>

      <motion.div variants={formRow} className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          E-mail
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            required
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div variants={formRow} className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">
          Senha
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            autoComplete="current-password"
            required
            className="pr-10"
          />
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={springUI}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={formRow}>
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full font-semibold">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </Button>
      </motion.div>
    </motion.form>
  );
}
