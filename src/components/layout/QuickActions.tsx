"use client";

import { Landmark, ListTodo, NotebookPen, Plus, ShoppingBag, ArrowRightLeft, FileUp } from "lucide-react";
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
import { useActionStore } from "@/stores/action-store";

export function QuickActions() {
  const router = useRouter();
  const { openTransaction, openTransfer, openTask, openWishlist, openImport } =
    useActionStore();

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
        <DropdownMenuContent side="top" align="end" sideOffset={8} className="w-64 p-2 rounded-lg">
          <DropdownMenuItem onClick={() => openTransaction()}>
            <Landmark className="h-4 w-4" />
            Registrar gasto ou entrada
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTransfer()}>
            <ArrowRightLeft className="h-4 w-4" />
            Transferência ou aporte
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openImport()}>
            <FileUp className="h-4 w-4" />
            Importar extrato
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTask()}>
            <ListTodo className="h-4 w-4" />
            Nova tarefa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openWishlist()}>
            <ShoppingBag className="h-4 w-4" />
            Novo desejo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void createNoteAndOpen()}>
            <NotebookPen className="h-4 w-4" />
            Nova anotação
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
