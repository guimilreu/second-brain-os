import { CalendarDays, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { TasksBoard } from "@/features/tasks/components/TasksBoard";
import { getTasksOverview } from "@/features/tasks/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata = {
  title: "Tarefas",
};

export default async function TasksPage() {
  const user = await requireCurrentUser();
  const data = await getTasksOverview(user.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tarefas"
        title="Sua sprint semanal saiu do caderno e virou sistema."
        description="Planeje de segunda a domingo, separe por projeto e acompanhe o avanço real do trabalho sem perder o contexto entre side-hustles."
        action={
          <>
            <a
              href="#sprint-board"
              className="hidden rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-muted-foreground transition hover:border-brand hover:text-brand md:inline-flex"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Semana atual
            </a>
            <a
              href="#tasks-board"
              className="inline-flex rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Plus className="mr-2 h-4 w-4" />
              Planejar
            </a>
          </>
        }
      />
      <Reveal delay={0.03}>
        <TasksBoard {...data} />
      </Reveal>
    </div>
  );
}
