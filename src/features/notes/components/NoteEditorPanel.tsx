"use client";

import {
  ArrowLeft,
  Copy,
  FolderOpen,
  Loader2,
  Palette,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { NoteBlockEditorHandle } from "@/features/notes/components/NoteBlockEditor";
import { NoteBlockEditor } from "@/features/notes/components/NoteBlockEditor";
import { NOTE_ACCENT_META, NOTE_ACCENT_OPTIONS } from "@/features/notes/lib/accents";
import type { NoteDetailDTO, NoteFolderDTO, NoteListItemDTO } from "@/features/notes/lib/types";
import type { NoteAccent } from "@/lib/note-accents";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type NoteEditorPanelProps = {
  noteId: string | null;
  folders: NoteFolderDTO[];
  onCloseMobile: () => void;
  onDeleted: (id: string) => void;
  onUpdatedMeta: (item: NoteListItemDTO) => void;
  showMobileBack: boolean;
};

function noteToListItem(note: NoteDetailDTO): NoteListItemDTO {
  return {
    id: note.id,
    title: note.title,
    updatedAt:
      typeof note.updatedAt === "string" ? note.updatedAt : new Date().toISOString(),
    snippet: note.snippet ?? "",
    accent: note.accent,
    pinned: note.pinned,
    folderId: note.folderId ?? null,
  };
}

function EmptyNotePlaceholder() {
  return (
    <div className="paper-note flex min-h-[min(70vh,560px)] flex-col items-center justify-center rounded-[1.75rem] p-10 text-center">
      <p className="text-sm text-muted-foreground">
        Selecione uma nota na lista ou crie uma nova para começar a escrever.
      </p>
    </div>
  );
}

type NoteEditorBodyProps = Omit<NoteEditorPanelProps, "noteId"> & { noteId: string };

function NoteEditorBody({
  noteId,
  folders,
  onCloseMobile,
  onDeleted,
  onUpdatedMeta,
  showMobileBack,
}: NoteEditorBodyProps) {
  const confirm = useConfirm();
  const [detail, setDetail] = useState<NoteDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitle = useRef("");
  const lastPersistedTitle = useRef("");
  const editorRef = useRef<NoteBlockEditorHandle>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`/api/notes/${noteId}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const d = body.data as NoteDetailDTO & { userId?: string; createdAt?: string };
        setDetail(d);
        setTitle(d.title);
        latestTitle.current = d.title;
        lastPersistedTitle.current = d.title;
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível abrir a nota.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  const persistTitle = useCallback(
    async (nextTitle: string) => {
      const normalizedTitle = nextTitle.trim();
      if (!noteId || !normalizedTitle || normalizedTitle === lastPersistedTitle.current) {
        return null;
      }
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalizedTitle }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      const updated = body.data as NoteDetailDTO;
      lastPersistedTitle.current = updated.title;
      return updated;
    },
    [noteId],
  );

  const flushTitle = useCallback(
    async (nextTitle: string) => {
      const updated = await persistTitle(nextTitle);
      if (!updated) return;
      setDetail((prev) => (prev ? { ...prev, title: updated.title } : prev));
      onUpdatedMeta(noteToListItem(updated));
    },
    [onUpdatedMeta, persistTitle],
  );

  const onTitleChange = (value: string) => {
    setTitle(value);
    latestTitle.current = value;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void flushTitle(value);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current);
      void persistTitle(latestTitle.current).then((updated) => {
        if (updated) onUpdatedMeta(noteToListItem(updated));
      });
    };
  }, [onUpdatedMeta, persistTitle]);

  const patchNote = useCallback(
    async (patch: { accent?: NoteAccent; pinned?: boolean; folderId?: string | null }) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        toast.error("Não foi possível atualizar.");
        return;
      }
      const body = await res.json();
      const updated = body.data as NoteDetailDTO;
      setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
      onUpdatedMeta(noteToListItem({ ...updated, updatedAt: new Date().toISOString() }));
    },
    [noteId, onUpdatedMeta],
  );

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Excluir anotação?",
      description: "Esta ação não pode ser desfeita.",
      destructive: true,
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Anotação excluída.");
    onDeleted(noteId);
  };

  const handleCopyMd = async () => {
    try {
      await editorRef.current?.copyMarkdownToClipboard();
      toast.success("Markdown copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const accent = detail?.accent ?? "default";
  const handleBlocksSaved = useCallback(
    (updated: NoteDetailDTO) => {
      setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
      onUpdatedMeta(noteToListItem(updated));
    },
    [onUpdatedMeta],
  );

  return (
    <div className="flex min-h-[min(70vh,560px)] flex-col gap-4">
      <div
        className={cn(
          "paper-note flex flex-wrap items-center gap-3 rounded-[1.75rem] p-4 shadow-paper-sm ring-2 ring-offset-2 ring-offset-background transition-shadow",
          NOTE_ACCENT_META[accent].ring,
        )}
      >
        {showMobileBack ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 rounded-xl lg:hidden"
            onClick={onCloseMobile}
            aria-label="Voltar à lista"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => void flushTitle(title)}
          className="min-w-[12rem] flex-1 border-transparent bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0 md:text-xl"
          placeholder="Título da nota"
        />
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-xl"
            onClick={() => patchNote({ pinned: !detail?.pinned })}
            disabled={!detail || loading}
            aria-label={detail?.pinned ? "Desfixar" : "Fixar"}
          >
            {detail?.pinned ? (
              <Pin className="h-4 w-4 fill-current" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.8rem] font-medium text-foreground outline-none hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              disabled={!detail || loading}
            >
              <FolderOpen className="h-4 w-4" />
              Pasta
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-52 overflow-y-auto">
              <DropdownMenuItem onClick={() => patchNote({ folderId: null })}>
                Sem pasta
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => patchNote({ folderId: f.id })}>
                  {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.8rem] font-medium text-foreground outline-none hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              disabled={!detail || loading}
            >
              <Palette className="h-4 w-4" />
              Cor
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {NOTE_ACCENT_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => patchNote({ accent: opt.value })}>
                  <span className={cn("mr-2 h-3 w-3 rounded-full", opt.bar)} aria-hidden />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-xl"
            onClick={() => void handleCopyMd()}
            disabled={loading}
          >
            <Copy className="mr-1 h-4 w-4" />
            Markdown
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-xl text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => void handleDelete()}
            disabled={loading}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </div>

      {loading || !detail ? (
        <div className="flex flex-1 items-center justify-center rounded-[1.75rem] border border-dashed border-border py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <NoteBlockEditor
          ref={editorRef}
          key={detail.id}
          noteId={detail.id}
          initialBlocks={detail.blocks as unknown[] | undefined}
          onBlocksSaved={handleBlocksSaved}
        />
      )}
    </div>
  );
}

export function NoteEditorPanel({ noteId, ...rest }: NoteEditorPanelProps) {
  if (!noteId) {
    return <EmptyNotePlaceholder />;
  }
  return <NoteEditorBody key={noteId} noteId={noteId} {...rest} />;
}
