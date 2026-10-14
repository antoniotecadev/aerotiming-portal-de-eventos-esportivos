import { Bike, Footprints, Mountain, PersonStanding, Trophy, Waves } from "lucide-react";
import type { CategorySlug } from "@/lib/types";

const ICONS: Record<CategorySlug, React.ComponentType<{ className?: string }>> = {
  corrida: PersonStanding,
  caminhada: Footprints,
  ciclismo: Bike,
  btt: Bike,
  trail: Mountain,
  triatlo: Waves,
};

export function CategoryIcon({ slug, className }: { slug: CategorySlug | "todas"; className?: string }) {
  const Icon = slug === "todas" ? Trophy : ICONS[slug];
  return <Icon className={className} />;
}

/** Cor de fundo suave por categoria (chips e etiquetas). */
export const CATEGORY_TONE: Record<CategorySlug, string> = {
  corrida: "bg-brand-50 text-brand-700",
  caminhada: "bg-pink-50 text-pink-700",
  ciclismo: "bg-emerald-50 text-emerald-700",
  btt: "bg-lime-50 text-lime-800",
  trail: "bg-amber-50 text-amber-800",
  triatlo: "bg-sky-50 text-sky-700",
};
