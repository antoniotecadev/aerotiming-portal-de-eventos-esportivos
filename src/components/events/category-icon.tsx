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
  const Icon = slug === "todas" ? Trophy : ICONS[slug as keyof typeof ICONS] ?? Trophy;
  return <Icon className={className} />;
}

/** Cor de fundo suave por categoria (chips e etiquetas). */
export const CATEGORY_TONE: Record<string, string> = {
  corrida: "bg-brand-50 text-brand-700",
  caminhada: "bg-brand-50 text-brand-700",
  ciclismo: "bg-brand-50 text-brand-700",
  btt: "bg-brand-50 text-brand-700",
  trail: "bg-brand-50 text-brand-700",
  triatlo: "bg-brand-50 text-brand-700",
};

export const categoryTone = (slug: string) => CATEGORY_TONE[slug] ?? "bg-brand-50 text-brand-700";
