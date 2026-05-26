"use client";

import { Landmark, ListTodo, NotebookPen, Plus, Sparkles, ArrowRightLeft, FileUp } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

  async function createNoteAndOpen() {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      const id = body.data?.id as string | undefined;
      if (id) {
        router.push(`/notes?open=${id}`);
        router.refresh();
        return;
      }
    } catch {
      toast.error("Não foi possível criar a nota.");
    }
    router.push("/notes");
    router.refresh();
  }

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
              className="h-11 w-11 rounded-full border border-border bg-paper text-foreground shadow-paper-sm transition-colors duration-200 hover:bg-brand/15"
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
          <DropdownMenuItem onClick={() => router.push("/finance#tabs")}>
            <ArrowRightLeft className="h-4 w-4" />
            Transferência ou aporte
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".ofx,.csv";
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                const lower = file.name.toLowerCase();
                fd.append(
                  "format",
                  lower.endsWith(".csv") ? "csv-generic" : "ofx",
                );
                try {
                  const acc = await fetch("/api/finance/accounts");
                  const j = await acc.json();
                  const first = j.data?.[0]?.id;
                  if (!first) {
                    toast.error("Crie uma conta antes de importar.");
                    return;
                  }
                  fd.append("bankAccountId", first);
                  const res = await fetch("/api/finance/imports", { method: "POST", body: fd });
                  if (!res.ok) throw new Error();
                  toast.success("Extrato importado.");
                  router.refresh();
                } catch {
                  toast.error("Falha na importação.");
                }
              };
              input.click();
            }}
          >
            <FileUp className="h-4 w-4" />
            Importar extrato (OFX ou CSV, 1ª conta)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void createNoteAndOpen()}>
            <NotebookPen className="h-4 w-4" />
            Nova anotação
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
