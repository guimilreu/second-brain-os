"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { eachDayOfInterval, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  FilePenLine,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { TaskDialog } from "@/features/tasks/components/dialogs/TaskDialog";
import { ProjectDialog } from "@/features/tasks/components/dialogs/ProjectDialog";
import { SprintDialog } from "@/features/tasks/components/dialogs/SprintDialog";
import { formatWeekRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { listContainer, listItem, springPage, springSnap } from "@/lib/motion/spring";

type TaskStatus = "todo" | "doing" | "done" | "blocked";

type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  projectId?: string | { id?: string; _id?: string; name?: string; color?: string };
  sprintId?: string;
  plannedFor?: string;
};

type Sprint = {
  id: string;
  title: string;
  intention: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

type TasksBoardProps = {
  sprint: Record<string, unknown>;
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground border-transparent",
  medium: "bg-primary/10 text-primary border-transparent",
  high: "bg-warning/10 text-warning border-transparent",
  critical: "bg-danger/10 text-danger border-transparent",
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
  blocked: "doing",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "A fazer",
  doing: "Em execução",
  blocked: "Bloqueada",
  done: "Concluída",
};

function getProjectId(task: Task): string {
  if (!task.projectId) return "";
  if (typeof task.projectId === "string") return task.projectId;
  return task.projectId._id?.toString() ?? task.projectId.id ?? "";
}

function getProjectName(task: Task, projects: Project[]): string | null {
  if (!task.projectId) return null;
  if (typeof task.projectId === "object" && task.projectId.name) {
    return task.projectId.name;
  }
  const id = getProjectId(task);
  return projects.find((p) => p.id === id)?.name ?? null;
}

function getProjectColor(task: Task, projects: Project[]): string {
  if (!task.projectId) return "#6b7280";
  if (typeof task.projectId === "object" && task.projectId.color) {
    return task.projectId.color;
  }
  const id = getProjectId(task);
  return projects.find((p) => p.id === id)?.color ?? "#6b7280";
}

export function TasksBoard({
  sprint: sprintRaw,
  projects: projectsRaw,
  tasks: tasksRaw,
}: TasksBoardProps) {
  const sprint = sprintRaw as unknown as Sprint;
  const router = useRouter();
  const initialProjects = projectsRaw as unknown as Project[];
  const initialTasks = tasksRaw as unknown as Task[];

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);

  const refreshTasks = useCallback(async () => {
    const res = await axios.get<{ data: Task[] }>("/api/tasks");
    const sprintTasks = res.data.data.filter(
      (t) => t.sprintId === sprint.id,
    );
    setTasks(sprintTasks);
  }, [sprint.id]);

  const refreshProjects = useCallback(async () => {
    const res = await axios.get<{ data: Project[] }>("/api/tasks/projects");
    setProjects(res.data.data);
  }, []);

  async function handleStatusCycle(task: Task) {
    const nextStatus = STATUS_CYCLE[task.status];
    try {
      await axios.patch(`/api/tasks/${task.id}`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      );
      if (nextStatus === "done") toast.success(`"${task.title}" concluída! ✓`);
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  }

  async function handleToggleDone(task: Task) {
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      await axios.patch(`/api/tasks/${task.id}`, { status: nextStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)),
      );
      if (nextStatus === "done") toast.success(`"${task.title}" concluída! ✓`);
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tarefa removida.");
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Arquivar este projeto?")) return;
    try {
      await axios.delete(`/api/tasks/projects/${id}`);
      toast.success("Projeto arquivado.");
      void refreshProjects();
    } catch {
      toast.error("Erro ao arquivar projeto.");
    }
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const pendingCount = tasks.length - doneCount;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const weekDays = eachDayOfInterval({
    start: new Date(sprint.startsAt),
    end: new Date(sprint.endsAt),
  });
  const visibleTasks =
    selectedDay === "all"
      ? tasks
      : tasks.filter((task) => task.plannedFor && isSameDay(new Date(task.plannedFor), new Date(selectedDay)));

  return (
    <div className="space-y-6">
      {/* Sprint header */}
      <section id="sprint-board" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1fr_18rem]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPage}
          whileHover={{ y: -2 }}
          className="paper-sheet rounded-[2.25rem] p-6 transition-shadow duration-300 md:p-8"
        >
          <p className="text-sm text-muted-foreground">
            {formatWeekRange(sprint.startsAt, sprint.endsAt)}
          </p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-4xl font-bold tracking-[-0.04em] text-paper-ink">{sprint.title}</h2>
              {sprint.intention ? (
                <p className="mt-2 max-w-2xl text-muted-foreground">{sprint.intention}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setSprintDialogOpen(true)}
                className="rounded-2xl"
              >
                <FilePenLine className="h-4 w-4" />
                Editar sprint
              </Button>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskDialogOpen(true);
                }}
                className="rounded-2xl"
              >
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <ProgressMeter
              value={progress}
              color={progress >= 70 ? "success" : progress >= 35 ? "primary" : "warning"}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {doneCount} de {tasks.length} tarefas · {progress}% concluído
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPage, delay: 0.06 }}
          whileHover={{ y: -2 }}
          className="paper-note rounded-[1.75rem] p-6 transition-shadow duration-300"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Projetos ativos</p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Novo projeto"
              onClick={() => {
                setEditingProject(null);
                setProjectDialogOpen(true);
              }}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-4xl font-semibold">{projects.length}</p>
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="visible"
            className="mt-5 space-y-2"
          >
            {projects.slice(0, 5).map((project) => (
              <motion.div
                key={project.id}
                variants={listItem}
                className="group flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate text-sm">{project.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => {
                      setEditingProject(project);
                      setProjectDialogOpen(true);
                    }}
                    className="rounded-lg"
                    aria-label="Editar projeto"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleDeleteProject(project.id)}
                    className="rounded-lg hover:text-danger"
                    aria-label="Arquivar projeto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
            {!projects.length ? (
              <p className="text-sm text-muted-foreground">Crie projetos para separar suas tarefas.</p>
            ) : null}
          </motion.div>
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="paper-note rounded-[1.65rem] p-5">
          <p className="text-sm text-muted-foreground">Concluídas</p>
          <p className="mt-2 text-3xl font-semibold text-success">{doneCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Fechadas nesta sprint</p>
        </div>
        <div className="paper-note rounded-[1.65rem] p-5">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="mt-2 text-3xl font-semibold text-warning">{pendingCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Candidatas para hoje ou próxima semana</p>
        </div>
        <div className="paper-note rounded-[1.65rem] p-5">
          <p className="text-sm text-muted-foreground">Bloqueadas</p>
          <p className="mt-2 text-3xl font-semibold text-danger">{blockedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Precisam de decisão ou contexto</p>
        </div>
      </section>

      <section className="paper-note rounded-[1.75rem] p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Planejamento por dia</p>
            <p className="text-xs text-muted-foreground">
              Filtre o kanban pelo dia marcado em &ldquo;Planejada para&rdquo;.
            </p>
          </div>
          <Badge className="rounded-full bg-primary/10 text-primary border-transparent">
            {visibleTasks.length} tarefa{visibleTasks.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={selectedDay === "all" ? "default" : "ghost"}
            onClick={() => setSelectedDay("all")}
            className="rounded-full"
          >
            Semana
          </Button>
          {weekDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasks.filter(
              (task) => task.plannedFor && isSameDay(new Date(task.plannedFor), day),
            );

            return (
              <Button
                key={key}
                size="sm"
                variant={selectedDay === key ? "default" : "ghost"}
                onClick={() => setSelectedDay(key)}
                className="shrink-0 rounded-full"
              >
                {format(day, "EEE dd", { locale: ptBR })} · {dayTasks.length}
              </Button>
            );
          })}
        </div>
      </section>

      <section id="tasks-board" className="paper-note scroll-mt-24 rounded-[1.75rem] p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Checklist da semana</p>
            <h3 className="font-heading text-2xl font-bold tracking-[-0.03em] text-paper-ink">
              Marque, ajuste e siga em frente.
            </h3>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskDialogOpen(true);
            }}
            className="rounded-2xl"
          >
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visibleTasks.map((task) => {
              const projectName = getProjectName(task, projects);
              const projectColor = getProjectColor(task, projects);
              const isDone = task.status === "done";

              return (
                <motion.article
                  key={task.id}
                  layout
                  transition={{ layout: springSnap, ...springSnap }}
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: springSnap }}
                  className={cn(
                    "group rounded-2xl border border-border/80 bg-transparent p-4 transition-colors duration-200 hover:bg-card/75 dark:bg-default-50/20",
                    isDone && "bg-surface-soft/45",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void handleToggleDone(task)}
                      className={cn(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                        isDone
                          ? "border-success bg-success text-white"
                          : "border-border bg-paper hover:border-brand hover:text-brand",
                      )}
                      aria-label={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h4
                            className={cn(
                              "text-base font-semibold leading-6",
                              isDone && "text-muted-foreground line-through",
                            )}
                          >
                            {task.title}
                          </h4>
                          {task.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {task.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskDialogOpen(true);
                            }}
                            className="rounded-lg"
                            aria-label="Editar tarefa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            onClick={() => handleDeleteTask(task.id)}
                            className="rounded-lg hover:text-danger"
                            aria-label="Remover tarefa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "rounded-full",
                            PRIORITY_BADGE_CLASSES[task.priority] ?? PRIORITY_BADGE_CLASSES.medium,
                          )}
                        >
                          {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </Badge>
                        <Badge className="rounded-full bg-secondary text-secondary-foreground border-transparent">
                          {STATUS_LABELS[task.status]}
                        </Badge>
                        {projectName ? (
                          <Badge
                            className="rounded-full border-transparent"
                            style={{
                              backgroundColor: `${projectColor}20`,
                              color: projectColor,
                            }}
                          >
                            {projectName}
                          </Badge>
                        ) : null}
                        {task.plannedFor ? (
                          <Badge className="rounded-full bg-secondary text-secondary-foreground border-transparent">
                            {format(new Date(task.plannedFor), "dd/MM")}
                          </Badge>
                        ) : null}
                        {task.status !== "done" && task.status !== "todo" ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusCycle(task)}
                            className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors duration-200 hover:text-brand hover:underline"
                          >
                            Avançar status
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>

          {!visibleTasks.length ? (
            <Button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setTaskDialogOpen(true);
              }}
              variant="outline"
              className="h-auto w-full rounded-2xl border-dashed py-10 text-muted-foreground hover:text-foreground"
            >
              + Adicionar primeira tarefa
            </Button>
          ) : null}
        </div>
      </section>

      {/* Project distribution */}
      {projects.length > 0 ? (
        <section className="paper-note rounded-[1.75rem] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-soft p-3 text-brand">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visão por projeto</p>
                <h2 className="text-2xl font-semibold">Distribuição da sprint</h2>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const projectTasks = tasks.filter((t) => getProjectId(t) === project.id);
              const doneTasks = projectTasks.filter((t) => t.status === "done").length;
              const pct = projectTasks.length
                ? Math.round((doneTasks / projectTasks.length) * 100)
                : 0;

              return (
                <div key={project.id} className="rounded-3xl border border-border bg-transparent p-5 transition-colors duration-200 hover:bg-card/70">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <h3 className="font-semibold">{project.name}</h3>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {doneTasks}/{projectTasks.length}
                    </span>
                  </div>
                  {project.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
                  ) : null}
                  {projectTasks.length > 0 ? (
                    <div className="mt-4">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: project.color }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{pct}% concluído</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Nenhuma tarefa nesta sprint</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <TaskDialog
        key={editingTask?.id ?? "new-task"}
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        task={editingTask}
        projects={projects}
        sprintId={sprint.id}
        onSaved={() => {
          setTaskDialogOpen(false);
          void refreshTasks();
        }}
      />

      <ProjectDialog
        key={editingProject?.id ?? "new-project"}
        open={projectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
        project={editingProject}
        onSaved={() => {
          setProjectDialogOpen(false);
          void refreshProjects();
        }}
      />

      <SprintDialog
        key={sprint.id}
        open={sprintDialogOpen}
        onClose={() => setSprintDialogOpen(false)}
        sprint={sprint}
        onSaved={() => {
          setSprintDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
