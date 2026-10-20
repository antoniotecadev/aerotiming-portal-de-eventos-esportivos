// Utilitários do perfil. Os dados vêm do servidor (src/server/queries/profile.ts).
import type { RegistrationWithEvent } from "@/lib/types";

export type { RegistrationWithEvent, ResultWithEvent } from "@/lib/types";

export const isActive = (r: RegistrationWithEvent) => r.status === "confirmada" || r.status === "pagamento-pendente";
export const isUpcoming = (r: RegistrationWithEvent, today: string) => r.event.date >= today && isActive(r);

/** "01:23:45" → segundos */
export function toSeconds(hms: string) {
  return hms.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
}
