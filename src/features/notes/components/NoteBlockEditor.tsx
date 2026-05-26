"use client";

import "@blocknote/shadcn/style.css";

import { blocksToMarkdown, type BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { NoteDetailDTO } from "@/features/notes/lib/types";

export type NoteBlockEditorHandle = {
  copyMarkdownToClipboard: () => Promise<void>;
};

type NoteBlockEditorProps = {
  noteId: string;
  initialBlocks: unknown[] | undefined;
  onBlocksSaved?: (note: NoteDetailDTO) => void;
};

function serializeBlocks(editor: BlockNoteEditor) {
  return JSON.stringify(editor.document);
}

function parseBlocks(serializedBlocks: string) {
  return JSON.parse(serializedBlocks) as unknown[];
}

async function persistBlocksJson(noteId: string, serializedBlocks: string) {
  const blocks = parseBlocks(serializedBlocks);
  const res = await fetch(`/api/notes/${noteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) {
    throw new Error("Falha ao salvar blocos");
  }
  const body = await res.json();
  return body.data as NoteDetailDTO;
}

export const NoteBlockEditor = forwardRef<NoteBlockEditorHandle, NoteBlockEditorProps>(
  function NoteBlockEditor({ noteId, initialBlocks, onBlocksSaved }, ref) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const editor = useCreateBlockNote(
      {
        initialContent:
          initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length > 0
            ? (initialBlocks as PartialBlock[])
            : undefined,
      },
      [noteId],
    );

    const editorRef = useRef(editor);
    editorRef.current = editor;

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPersistedBlocks = useRef<string | null>(null);
    const hasPendingChanges = useRef(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

    useEffect(() => {
      lastPersistedBlocks.current = serializeBlocks(editorRef.current);
      hasPendingChanges.current = false;
      setSaveStatus("idle");
    }, [noteId]);

    const persist = useCallback(async () => {
      const ed = editorRef.current;
      const serializedBlocks = serializeBlocks(ed);
      if (!hasPendingChanges.current || serializedBlocks === lastPersistedBlocks.current) {
        hasPendingChanges.current = false;
        return;
      }

      setSaveStatus("saving");
      try {
        const saved = await persistBlocksJson(noteId, serializedBlocks);
        lastPersistedBlocks.current = serializedBlocks;
        hasPendingChanges.current = false;
        setSaveStatus("saved");
        onBlocksSaved?.(saved);
        setTimeout(() => setSaveStatus("idle"), 1800);
      } catch {
        setSaveStatus("idle");
      }
    }, [noteId, onBlocksSaved]);

    const scheduleSave = useCallback(() => {
      const serializedBlocks = serializeBlocks(editorRef.current);
      if (serializedBlocks === lastPersistedBlocks.current) {
        hasPendingChanges.current = false;
        return;
      }

      hasPendingChanges.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist();
      }, 850);
    }, [persist]);

    useEffect(() => {
      return () => {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
        }
        const ed = editorRef.current;
        const serializedBlocks = serializeBlocks(ed);
        if (!hasPendingChanges.current || serializedBlocks === lastPersistedBlocks.current) {
          return;
        }

        void persistBlocksJson(noteId, serializedBlocks)
          .then((saved) => {
            lastPersistedBlocks.current = serializedBlocks;
            hasPendingChanges.current = false;
            onBlocksSaved?.(saved);
          })
          .catch(() => {});
      };
    }, [noteId, onBlocksSaved]);

    useImperativeHandle(
      ref,
      () => ({
        copyMarkdownToClipboard: async () => {
          const ed = editorRef.current;
          const md = blocksToMarkdown(ed.document, ed.pmSchema, ed, {
            document: typeof document !== "undefined" ? document : undefined,
          });
          await navigator.clipboard.writeText(md);
        },
      }),
      [],
    );

    if (!mounted) {
      return <div className="h-[min(60vh,520px)] animate-pulse rounded-2xl bg-muted/40" />;
    }

    const theme = resolvedTheme === "dark" ? "dark" : "light";

    return (
      <div className="notes-blocknote-root relative min-h-[min(60vh,520px)] rounded-2xl border border-border bg-card/60 p-1 pr-2 shadow-paper-sm">
        <BlockNoteView editor={editor} theme={theme} onChange={() => scheduleSave()} />
        {saveStatus !== "idle" ? (
          <p className="pointer-events-none px-2 pb-2 text-right text-xs text-muted-foreground">
            {saveStatus === "saving" ? "Salvando…" : "Salvo"}
          </p>
        ) : null}
      </div>
    );
  },
);
