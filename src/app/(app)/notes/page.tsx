import { NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { NotesWorkspace } from "@/features/notes/components/NotesWorkspace";
import { getNoteFolders, getNotesList } from "@/features/notes/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";

export const metadata = {
  title: "Anotações — Second Brain OS",
};

type NotesPageProps = {
  searchParams?: Promise<{ open?: string }>;
};

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const user = await requireCurrentUser();
  const [initialNotes, initialFolders] = await Promise.all([
    getNotesList(user.userId, "all"),
    getNoteFolders(user.userId),
  ]);
  const params = searchParams ? await searchParams : {};
  const urlOpenNoteId = params.open ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Anotações"
        title="Pense, escreva e organize em blocos."
        description="Editor em markdown/blocos com atalhos, cores por nota, fixar favoritos e cópia rápida em Markdown — tudo salvo automaticamente."
        action={
          <span className="hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground shadow-paper-sm md:inline-flex">
            <NotebookPen className="h-4 w-4 text-brand" />
            Use / para inserir blocos
          </span>
        }
      />
      <Reveal delay={0.04}>
        <NotesWorkspace
          initialNotes={initialNotes}
          initialFolders={initialFolders}
          urlOpenNoteId={urlOpenNoteId}
        />
      </Reveal>
    </div>
  );
}
