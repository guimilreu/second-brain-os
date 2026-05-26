"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FolderPlus, Pin, Plus, Search } from "lucide-react";
import { useState } from "react";
import { NOTE_ACCENT_META } from "@/features/notes/lib/accents";
import type { NoteFolderDTO, NoteListItemDTO, NotesFolderFilter } from "@/features/notes/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type NoteListPanelProps = {
  notes: NoteListItemDTO[];
  selectedId: string | null;
  search: string;
  onSearchChange: (q: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
  folders: NoteFolderDTO[];
  activeFolder: NotesFolderFilter;
  onFolderChange: (folder: NotesFolderFilter) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

function folderChipClass(active: boolean) {
  return cn(
    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-foreground text-background shadow-paper-sm"
      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function NoteListPanel({
  notes,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onCreate,
  creating,
  folders,
  activeFolder,
  onFolderChange,
  onCreateFolder,
  onDeleteFolder,
}: NoteListPanelProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered =
    q.length === 0
      ? notes
      : notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) || (n.snippet && n.snippet.toLowerCase().includes(q)),
        );

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    try {
      await onCreateFolder(name);
      setNewFolderName("");
    } finally {
      setCreatingFolder(false);
    }
  }

  return (
    <div className="paper-note flex h-full max-h-[min(76vh,calc(100vh-200px))] flex-col rounded-[1.75rem] p-4 shadow-paper-sm">
      <div className="flex shrink-0 flex-col gap-3">
        <Button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="h-11 w-full justify-center rounded-2xl bg-brand text-primary-foreground shadow-paper-sm hover:bg-brand/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova nota
        </Button>

        <div className="space-y-2 border-b border-border/50 pb-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pastas
          </p>
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-0.5">
            <button
              type="button"
              className={folderChipClass(activeFolder === "all")}
              onClick={() => onFolderChange("all")}
            >
              Todas
            </button>
            <button
              type="button"
              className={folderChipClass(activeFolder === "none")}
              onClick={() => onFolderChange("none")}
            >
              Sem pasta
            </button>
            {folders.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  className={folderChipClass(activeFolder === f.id)}
                  onClick={() => onFolderChange(f.id)}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-muted-foreground hover:bg-danger/15 hover:text-danger"
                  aria-label={`Excluir pasta ${f.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteFolder(f.id);
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <FolderPlus className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateFolder();
                }}
                placeholder="Nome da pasta…"
                className="h-9 rounded-xl pl-8 text-sm"
                disabled={creatingFolder}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 shrink-0 rounded-xl"
              disabled={creatingFolder || !newFolderName.trim()}
              onClick={() => void handleCreateFolder()}
            >
              Criar
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar…"
            className="rounded-2xl border-border bg-background/80 pl-9"
          />
        </div>
      </div>

      <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <li className="rounded-2xl px-3 py-10 text-center text-sm text-muted-foreground">
            {notes.length === 0
              ? "Nenhuma anotação ainda. Crie a primeira."
              : "Nada encontrado para essa busca."}
          </li>
        ) : (
          filtered.map((note) => {
            const active = note.id === selectedId;
            const accent = NOTE_ACCENT_META[note.accent];
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  className={cn(
                    "interactive-card flex w-full items-start gap-2 rounded-2xl border px-3 py-3 text-left transition-[background-color,border-color,box-shadow] duration-200",
                    active ? accent.listCardActive : accent.listCard,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{note.title || "Sem título"}</span>
                      {note.pinned ? (
                        <Pin
                          className="h-3.5 w-3.5 shrink-0 fill-current text-brand"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    {note.snippet ? (
                      <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {note.snippet}
                      </span>
                    ) : (
                      <span className="mt-0.5 text-xs text-muted-foreground/70">Em branco</span>
                    )}
                    <span className="mt-1 block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                      {formatDistanceToNow(new Date(note.updatedAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
