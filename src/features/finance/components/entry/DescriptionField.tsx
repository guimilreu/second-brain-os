"use client";

import { useState } from "react";
import type { EntrySuggestion } from "@/features/finance/domain/suggestions";
import type { Category } from "@/features/finance/domain/types";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { cn } from "@/lib/utils";

type DescriptionFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  suggestions: EntrySuggestion[];
  onPick: (suggestion: EntrySuggestion) => void;
  /** Categoria e contexto ("Alimentação · Nubank · crédito") de cada sugestão. */
  describe: (suggestion: EntrySuggestion) => { category: Category | null; meta: string };
  inputRef: React.RefObject<HTMLInputElement | null>;
  hint?: React.ReactNode;
  error?: string;
};

/** "O que foi?": texto livre com autocompletar pelo histórico (↑↓ e Enter, ou toque). */
export function DescriptionField({
  id,
  label,
  value,
  placeholder,
  onChange,
  suggestions,
  onPick,
  describe,
  inputRef,
  hint,
  error,
}: DescriptionFieldProps) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${id}-suggestions`;
  const open = focused && value.trim().length > 0 && suggestions.length > 0;
  const activeIndex = open && active < suggestions.length ? active : -1;

  function pick(suggestion: EntrySuggestion) {
    setActive(-1);
    onPick(suggestion);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
    }
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[0.8125rem] font-semibold"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={160}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            setActive(-1);
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "h-11 w-full rounded-lg border bg-card px-3 text-base text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none sm:text-sm",
            error ? "border-negative" : "border-input",
          )}
        />
        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Sugestões"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {suggestions.map((suggestion, index) => {
              const { category, meta } = describe(suggestion);
              return (
                <li
                  key={suggestion.key}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  // Mantém o foco no campo para o toque escolher a sugestão.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => {
                    if (index !== active) setActive(index);
                  }}
                  onClick={() => pick(suggestion)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5",
                    index === activeIndex && "bg-muted",
                  )}
                >
                  <CategoryIcon
                    icon={category?.icon}
                    color={category?.color}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{suggestion.description}</span>
                    <span className="block truncate text-xs text-muted-foreground">{meta}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
