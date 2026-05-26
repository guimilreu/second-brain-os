"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type CalItem = { date: string; label: string; tone: "in" | "out" | "bill" };

export function FinanceCalendar({
  occurrences,
  month = new Date(),
}: {
  occurrences: { date: Date; title: string; type: string }[];
  month?: Date;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const o of occurrences) {
      const key = format(o.date, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push({
        date: key,
        label: o.title,
        tone: o.type === "income" ? "in" : "out",
      });
      map.set(key, list);
    }
    return map;
  }, [occurrences]);

  const startWeekday = start.getDay();
  const blanks = Array.from({ length: startWeekday }, (_, i) => i);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-paper-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Calendário
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
        {format(month, "MMMM yyyy", { locale: ptBR })}
      </h2>
      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {"DSTQQSS".split("").map((d) => (
          <span key={d}>{d}</span>
        ))}
        {blanks.map((b) => (
          <div key={`b-${b}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const items = itemsByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="min-h-[4rem] rounded-xl border border-border bg-background p-1.5 text-left text-[10px] sm:min-h-[5.5rem]"
            >
              <span className="font-semibold text-foreground">{format(day, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {items.slice(0, 2).map((it) => (
                  <div
                    key={`${key}-${it.label}`}
                    className={
                      it.tone === "in"
                        ? "truncate rounded bg-emerald-500/15 px-1 text-emerald-700"
                        : "truncate rounded bg-red-500/15 px-1 text-red-700"
                    }
                  >
                    {it.label}
                  </div>
                ))}
                {items.length > 2 ? (
                  <span className="text-muted-foreground">+{items.length - 2}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
