"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { NoteEditorPanel } from "@/features/notes/components/NoteEditorPanel";
import { NoteListPanel } from "@/features/notes/components/NoteListPanel";
import type {
  NoteFolderDTO,
  NoteListItemDTO,
  NotesFolderFilter,
} from "@/features/notes/lib/types";
import { cn } from "@/lib/utils/cn";

function sortNotesList(a: NoteListItemDTO, b: NoteListItemDTO) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

type NotesWorkspaceProps = {
  initialNotes: NoteListItemDTO[];
  initialFolders: NoteFolderDTO[];
  urlOpenNoteId: string | null;
};

export function NotesWorkspace({
  initialNotes,
  initialFolders,
  urlOpenNoteId,
}: NotesWorkspaceProps) {
  const confirm = useConfirm();
  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [activeFolderId, setActiveFolderId] = useState<NotesFolderFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    urlOpenNoteId ?? initialNotes[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileMode, setMobileMode] = useState<"list" | "editor">(() =>
    urlOpenNoteId ? "editor" : "list",
  );

  const firstFolderFetch = useRef(true);

  const refreshFolders = useCallback(async () => {
    const r = await fetch("/api/note-folders");
    if (!r.ok) return;
    const body = await r.json();
    setFolders(body.data as NoteFolderDTO[]);
  }, []);

  const refreshNotes = useCallback(async (folder: NotesFolderFilter) => {
    const q = folder === "all" ? "" : `?folderId=${encodeURIComponent(folder)}`;
    const r = await fetch(`/api/notes${q}`);
    if (!r.ok) return;
    const body = await r.json();
    setNotes(body.data as NoteListItemDTO[]);
  }, []);

  useEffect(() => {
    if (firstFolderFetch.current && activeFolderId === "all") {
      firstFolderFetch.current = false;
      return;
    }
    void refreshNotes(activeFolderId);
  }, [activeFolderId, refreshNotes]);

  useEffect(() => {
    if (!urlOpenNoteId) return;
    startTransition(() => {
      setSelectedId(urlOpenNoteId);
      setMobileMode("editor");
    });
  }, [urlOpenNoteId]);

  const handleCreateFolder = async (name: string) => {
    const res = await fetch("/api/note-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error("Não foi possível criar a pasta.");
      return;
    }
    toast.success("Pasta criada.");
    await refreshFolders();
  };

  const handleDeleteFolder = async (folderId: string) => {
    const ok = await confirm({
      title: "Excluir pasta?",
      description: "As notas dentro dela passam a ficar sem pasta.",
      destructive: true,
      confirmLabel: "Excluir",
    });
    if (!ok) {
      return;
    }
    const res = await fetch(`/api/note-folders/${folderId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Não foi possível excluir a pasta.");
      return;
    }
    toast.success("Pasta removida.");
    if (activeFolderId === folderId) {
      setActiveFolderId("all");
      await refreshNotes("all");
    } else {
      await refreshNotes(activeFolderId);
    }
    await refreshFolders();
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {};
      if (activeFolderId !== "all" && activeFolderId !== "none") {
        payload.folderId = activeFolderId;
      }

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const body = await res.json();
      const row = body.data as NoteListItemDTO;
      const item: NoteListItemDTO = {
        id: row.id,
        title: row.title,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
        snippet: row.snippet ?? "",
        accent: row.accent,
        pinned: row.pinned,
        folderId: row.folderId ?? null,
      };
      const matchesFilter =
        activeFolderId === "all" ||
        (activeFolderId === "none" && !item.folderId) ||
        item.folderId === activeFolderId;

      if (matchesFilter) {
        setNotes((prev) => [item, ...prev]);
      }
      setSelectedId(item.id);
      setMobileMode("editor");
      toast.success("Nova anotação criada.");
    } catch {
      toast.error("Não foi possível criar a nota.");
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileMode("editor");
  };

  const handleDeleted = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      setSelectedId((cur) => (cur !== id ? cur : (next[0]?.id ?? null)));
      return next;
    });
    setMobileMode("list");
    void refreshNotes(activeFolderId);
  };

  const handleUpdatedMeta = useCallback(
    (item: NoteListItemDTO) => {
      setNotes((prev) => {
        const shouldShow =
          activeFolderId === "all" ||
          (activeFolderId === "none" && !item.folderId) ||
          (activeFolderId !== "none" &&
            activeFolderId !== "all" &&
            item.folderId === activeFolderId);

        const idx = prev.findIndex((n) => n.id === item.id);
        if (!shouldShow) {
          return prev.filter((n) => n.id !== item.id);
        }
        if (idx === -1) {
          return [...prev, item].sort(sortNotesList);
        }
        const next = [...prev];
        next[idx] = { ...next[idx], ...item };
        return next.sort(sortNotesList);
      });
    },
    [activeFolderId],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <section className={cn("min-h-0 lg:block", mobileMode === "editor" ? "hidden" : "block")}>
        <NoteListPanel
          notes={notes}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onCreate={() => void handleCreate()}
          creating={creating}
          folders={folders}
          activeFolder={activeFolderId}
          onFolderChange={setActiveFolderId}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </section>
      <section className={cn("min-h-0 lg:block", mobileMode === "list" ? "hidden" : "block")}>
        <NoteEditorPanel
          noteId={selectedId}
          folders={folders}
          showMobileBack={mobileMode === "editor"}
          onCloseMobile={() => setMobileMode("list")}
          onDeleted={handleDeleted}
          onUpdatedMeta={handleUpdatedMeta}
        />
      </section>
    </div>
  );
}
