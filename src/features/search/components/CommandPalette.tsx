"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  FileUp,
  Loader2,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  Search,
  Tag,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NAV_SECTIONS } from "@/components/layout/nav";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Money } from "@/components/ui/Money";
import { accountLabel, hintedAccount } from "@/features/finance/components/entry/entryLogic";
import { addDays } from "@/features/finance/domain/dates";
import { dayMonth } from "@/features/finance/domain/labels";
import { normalizeDescription, parseQuickEntry } from "@/features/finance/domain/quickEntry";
import { searchFinance, type SearchHit } from "@/features/finance/server/actions";
import type { ShellData } from "@/features/finance/server/shell";
import { formatCents } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useEntryStore, type EntryDraft } from "@/stores/entry-store";
import { useUiStore } from "@/stores/ui-store";

// Perto do topo (Raycast/Linear); no celular fica acima do teclado.
const PALETTE_CLASSES =
  "top-3 flex max-h-[70dvh] w-full max-w-[calc(100%-1.5rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-[12vh] sm:max-h-[min(72dvh,560px)] sm:max-w-xl";

type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: LucideIcon;
  amountCents?: number;
  date?: string;
  shortcut?: string;
  run: () => void;
};

const PAGE_KEYWORDS: Record<string, string> = {
  "/": "inicio painel resumo avisos",
  "/transactions": "transacoes extrato historico gastos",
  "/month": "orcamento plano ainda pode gastar",
  "/cards": "fatura nubank credito",
  "/accounts": "saldo cofre cofrinho banco conferir",
  "/recurring": "recorrencias assinaturas contas mensais",
  "/settings": "ajustes cdi categorias",
};

const HIT_GROUPS: Record<SearchHit["kind"], { label: string; icon: LucideIcon }> = {
  transaction: { label: "Lançamentos", icon: Receipt },
  account: { label: "Contas", icon: Wallet },
  category: { label: "Categorias", icon: Tag },
  recurring: { label: "Fixas", icon: Repeat },
};

const HIT_ORDER: SearchHit["kind"][] = ["transaction", "account", "category", "recurring"];

function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Só busca no servidor o que tem letra: a busca ignora números (um "42" casaria com tudo). */
function isSearchable(term: string) {
  return term.length >= 2 && normalizeDescription(term).length > 0;
}

/** Busca e ações rápidas (⌘K / Ctrl+K). */
export function CommandPalette({ shell }: { shell: ShellData }) {
  const open = useUiStore((state) => state.isCommandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ao abrir o lançamento daqui, o foco vai para o formulário — não volta para onde estava.
  const launchingRef = useRef(false);

  // Cada abertura começa do zero, mesmo se a anterior ainda estiver animando o fechamento.
  const [session, setSession] = useState({ open, key: 0 });
  if (session.open !== open) {
    setSession({ open, key: open ? session.key + 1 : session.key });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      // Com o lançamento aberto, não empilha outro diálogo por cima.
      if (useEntryStore.getState().isOpen) return;
      event.preventDefault();
      const ui = useUiStore.getState();
      ui.setCommandOpen(!ui.isCommandOpen);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function launch(draft: EntryDraft) {
    launchingRef.current = true;
    setOpen(false);
    useEntryStore.getState().openNew(draft);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogContent
        showCloseButton={false}
        initialFocus={inputRef}
        finalFocus={() => {
          const restore = !launchingRef.current;
          launchingRef.current = false;
          return restore;
        }}
        className={PALETTE_CLASSES}
      >
        <PaletteBody
          key={session.key}
          shell={shell}
          inputRef={inputRef}
          onClose={() => setOpen(false)}
          onLaunch={launch}
        />
      </DialogContent>
    </Dialog>
  );
}

type PaletteBodyProps = {
  shell: ShellData;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onLaunch: (draft: EntryDraft) => void;
};

function PaletteBody({ shell, inputRef, onClose, onLaunch }: PaletteBodyProps) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const term = query.trim();
  const searchable = isSearchable(term);

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const result = await searchFinance({ query: term });
        if (cancelled) return;
        setHits(result.ok ? result.data : []);
      } catch {
        if (!cancelled) setHits([]);
      }
      if (!cancelled) setSearching(false);
    }, 180);
    return () => {
      // Resposta de uma busca antiga não sobrescreve a atual.
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term, searchable]);

  function changeQuery(value: string) {
    setQuery(value);
    setActive(0);
    const next = value.trim();
    if (next === term) return;
    const willSearch = isSearchable(next);
    setSearching(willSearch);
    if (!willSearch) setHits([]);
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const { accounts, accountUsage, today } = shell;
  const items: PaletteItem[] = [];

  // "uber 23 pix ontem" → lança direto, já preenchido.
  const parsed = term ? parseQuickEntry(term, today) : null;
  if (parsed?.amountCents) {
    const amountCents = parsed.amountCents;
    const hinted = hintedAccount(accounts, parsed, accountUsage, "expense");
    const when = parsed.date === addDays(today, -1) ? "ontem" : parsed.date && parsed.date !== today ? dayMonth(parsed.date) : null;
    items.push({
      id: "quick-entry",
      group: "Ações",
      label: `Lançar ${parsed.description ? `“${parsed.description}”` : "gasto"} de ${formatCents(amountCents)}`,
      hint:
        [
          parsed.installments ? `${parsed.installments}×` : null,
          hinted ? accountLabel(hinted, accounts, "pay") : null,
          when,
        ]
          .filter(Boolean)
          .join(" · ") || "Gasto",
      icon: Plus,
      run: () =>
        onLaunch({
          type: "expense",
          description: parsed.description || undefined,
          amountCents,
          installments: parsed.installments ?? undefined,
          date: parsed.date ?? undefined,
          accountId: hinted?.id,
          method: parsed.method && parsed.method !== "credit" ? parsed.method : undefined,
        }),
    });
  }

  const actions: PaletteItem[] = [
    {
      id: "expense",
      group: "Ações",
      label: "Lançar gasto",
      keywords: "novo despesa compra paguei",
      icon: Plus,
      shortcut: "N",
      run: () => onLaunch({ type: "expense" }),
    },
    {
      id: "income",
      group: "Ações",
      label: "Lançar entrada",
      keywords: "receita salario recebi reembolso estorno",
      icon: TrendingUp,
      run: () => onLaunch({ type: "income" }),
    },
    {
      id: "transfer",
      group: "Ações",
      label: "Transferir",
      keywords: "mover guardar resgatar cofre",
      icon: ArrowLeftRight,
      run: () => onLaunch({ type: "transfer" }),
    },
  ];
  if (accounts.some((account) => !account.archived && account.card)) {
    actions.push({
      id: "import-invoice",
      group: "Ações",
      label: "Importar fatura do cartão",
      hint: "CSV do Nubank, com revisão antes",
      keywords: "csv nubank extrato arquivo importar",
      icon: FileUp,
      run: () => go("/import"),
    });
  }
  const operating = accounts.find((account) => !account.archived && account.purpose === "operating");
  const cards = accounts.filter((account) => !account.archived && account.card?.reserveAccountId);
  for (const card of cards) {
    const reserve = accounts.find((account) => account.id === card.card?.reserveAccountId);
    if (!reserve) continue;
    const suffix = cards.length > 1 ? ` · ${card.name}` : "";
    actions.push({
      id: `pay-${card.id}`,
      group: "Ações",
      label: `Pagar fatura${suffix}`,
      hint: `Do cofre ${reserve.name} para o ${accountLabel(card, accounts)}`,
      keywords: "cartao credito nubank",
      icon: CreditCard,
      run: () => onLaunch({ type: "transfer", accountId: reserve.id, toAccountId: card.id, title: "Pagar fatura" }),
    });
    if (operating && operating.id !== reserve.id) {
      actions.push({
        id: `reserve-${card.id}`,
        group: "Ações",
        label: `Guardar no cofre ${reserve.name}`,
        hint: `Do ${accountLabel(operating, accounts)} para pagar a fatura`,
        keywords: "reservar fatura cartao",
        icon: PiggyBank,
        run: () =>
          onLaunch({
            type: "transfer",
            accountId: operating.id,
            toAccountId: reserve.id,
            title: `Guardar no cofre ${reserve.name}`,
          }),
      });
    }
  }

  const pages: PaletteItem[] = NAV_SECTIONS.flatMap((section) => section.items).map((item) => ({
    id: `page-${item.href}`,
    group: "Páginas",
    label: item.label,
    keywords: PAGE_KEYWORDS[item.href],
    icon: item.icon,
    run: () => go(item.href),
  }));

  const needle = fold(term);
  const matchesNeedle = (item: PaletteItem) => !needle || fold(`${item.label} ${item.keywords ?? ""}`).includes(needle);
  items.push(...actions.filter(matchesNeedle), ...pages.filter(matchesNeedle));

  // Locais primeiro: o resultado do servidor chega depois e não desloca o item ativo.
  if (searchable) {
    for (const kind of HIT_ORDER) {
      for (const hit of hits.filter((item) => item.kind === kind)) {
        items.push({
          id: `hit-${kind}-${hit.id}`,
          group: HIT_GROUPS[kind].label,
          label: hit.title,
          hint: hit.subtitle,
          icon: HIT_GROUPS[kind].icon,
          amountCents: hit.amountCents,
          date: hit.date,
          run: () => go(hit.href),
        });
      }
    }
  }

  const activeIndex = items.length ? Math.min(active, items.length - 1) : -1;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!items.length) return;
      const next = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      setActive(next);
      document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      items[activeIndex]?.run();
    }
  }

  const groups: { label: string; entries: { item: PaletteItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) last.entries.push({ item, index });
    else groups.push({ label: item.group, entries: [{ item, index }] });
  });

  return (
    <>
      <DialogTitle className="sr-only">Buscar e lançar</DialogTitle>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5">
        {searching ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Search className="size-4 shrink-0 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-label="Buscar ou lançar"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Buscar, ou lançar: “ifood 42,90”"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
        />
        <DialogClose className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <span className="sm:hidden">Fechar</span>
          <span className="hidden font-mono sm:inline">esc</span>
        </DialogClose>
      </div>

      <div
        id={listId}
        role="listbox"
        aria-label="Resultados"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
      >
        {groups.map((group) => (
          <div
            key={group.label}
            role="group"
            aria-label={group.label}
            className="pb-1"
          >
            <p className="px-2.5 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.entries.map(({ item, index }) => {
              const Icon = item.icon;
              const selected = index === activeIndex;
              return (
                <div
                  key={item.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => {
                    if (index !== active) setActive(index);
                  }}
                  onClick={() => item.run()}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                    selected && "bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-md",
                      selected ? "bg-card text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-semibold", selected && "text-accent-foreground")}>
                      {item.label}
                    </span>
                    {item.hint ? (
                      <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                    ) : null}
                  </span>
                  {item.amountCents !== undefined ? (
                    <span className="shrink-0 text-right">
                      <Money
                        cents={item.amountCents}
                        signed
                        className="block text-sm font-semibold"
                      />
                      {item.date ? (
                        <span className="block text-[0.6875rem] text-muted-foreground">{dayMonth(item.date)}</span>
                      ) : null}
                    </span>
                  ) : item.shortcut ? (
                    <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 font-mono text-[0.6875rem] text-muted-foreground sm:inline">
                      {item.shortcut}
                    </kbd>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
        {items.length ? null : (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {searching ? "Buscando…" : `Nada encontrado para “${term}”.`}
          </p>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-4 border-t border-border px-3.5 py-2 text-[0.6875rem] text-muted-foreground sm:flex">
        <span>
          <kbd className="font-mono">↑↓</kbd> navegar
        </span>
        <span>
          <kbd className="font-mono">↵</kbd> abrir
        </span>
        <span>
          <kbd className="font-mono">esc</kbd> fechar
        </span>
        <span className="ml-auto">Digite um valor para lançar direto</span>
      </div>
    </>
  );
}
