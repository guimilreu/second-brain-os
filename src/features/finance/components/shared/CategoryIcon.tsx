import {
  Baby,
  Book,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  History,
  Home,
  Laptop,
  Music,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Scale,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Undo2,
  Utensils,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícones disponíveis para categorias (nome salvo no banco → componente). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  "heart-pulse": HeartPulse,
  "party-popper": PartyPopper,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  "graduation-cap": GraduationCap,
  sparkles: Sparkles,
  plane: Plane,
  gift: Gift,
  briefcase: Briefcase,
  receipt: Receipt,
  "circle-ellipsis": CircleEllipsis,
  scale: Scale,
  history: History,
  laptop: Laptop,
  "trending-up": TrendingUp,
  "undo-2": Undo2,
  tag: Tag,
  coffee: Coffee,
  dumbbell: Dumbbell,
  baby: Baby,
  "paw-print": PawPrint,
  "gamepad-2": Gamepad2,
  book: Book,
  smartphone: Smartphone,
  wifi: Wifi,
  zap: Zap,
  fuel: Fuel,
  bus: Bus,
  pill: Pill,
  shirt: Shirt,
  wrench: Wrench,
  music: Music,
  film: Film,
};

type CategoryIconProps = {
  icon: string | null | undefined;
  color: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "size-7 rounded-md [&_svg]:size-3.5",
  md: "size-9 rounded-lg [&_svg]:size-4",
  lg: "size-11 rounded-xl [&_svg]:size-5",
} as const;

/** Quadrado com o ícone da categoria tingido com a cor dela. */
export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Tag;
  const tint = color ?? "#94a3b8";
  return (
    <span
      className={cn("grid shrink-0 place-items-center", SIZES[size], className)}
      style={{ backgroundColor: `${tint}1f`, color: tint }}
      aria-hidden
    >
      <Icon />
    </span>
  );
}
