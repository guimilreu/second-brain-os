import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatMonthKeyLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, "MMM yyyy", { locale: ptBR });
}
