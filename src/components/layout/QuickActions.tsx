"use client";

import { Landmark, ListTodo, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { springSnap } from "@/lib/motion/spring";

export function QuickActions() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...springSnap, delay: 0.15 }}
      className="fixed bottom-4 right-4 z-40 lg:bottom-6 lg:right-6"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon-lg"
              className="rounded-full border border-border bg-foreground text-background shadow-paper-sm hover:bg-foreground/90"
              aria-label="Ações rápidas"
            />
          }
        >
          <Plus className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={8}>
          <DropdownMenuItem onClick={() => router.push("/finance")}>
            <Landmark className="h-4 w-4" />
            Registrar gasto ou entrada
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/tasks#tasks-board")}>
            <ListTodo className="h-4 w-4" />
            Planejar tarefa da semana
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/")}>
            <Sparkles className="h-4 w-4" />
            Ver cockpit de hoje
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
