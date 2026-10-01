import {
  ArrowLeftRight,
  CalendarRange,
  CreditCard,
  Gauge,
  Repeat,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavSection = { label?: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/", label: "Hoje", icon: Gauge },
      { href: "/transactions", label: "Lançamentos", icon: ArrowLeftRight },
      { href: "/month", label: "Mês", icon: CalendarRange },
    ],
  },
  {
    label: "Dinheiro",
    items: [
      { href: "/cards", label: "Cartão", icon: CreditCard },
      { href: "/accounts", label: "Contas e cofres", icon: Wallet },
      { href: "/recurring", label: "Fixas", icon: Repeat },
    ],
  },
  {
    items: [{ href: "/settings", label: "Configurações", icon: Settings }],
  },
];

/** Itens fixos da barra inferior no mobile (o + fica no meio). */
export const MOBILE_NAV: NavItem[] = [
  { href: "/", label: "Hoje", icon: Gauge },
  { href: "/transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { href: "/cards", label: "Cartão", icon: CreditCard },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
