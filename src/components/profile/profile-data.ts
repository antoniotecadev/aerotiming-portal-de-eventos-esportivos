import type { RaceResult, Registration, SportsEvent, User } from "@/lib/types";
import { REGISTRATIONS, RESULTS, TODAY, getEvent } from "@/lib/data";

export interface RegistrationWithEvent extends Registration {
  event: SportsEvent;
  distance: SportsEvent["distances"][number] | undefined;
}

/** Inscrições do utilizador (mock: só o utilizador de demonstração tem inscrições). */
export function registrationsOf(user: User): RegistrationWithEvent[] {
  return REGISTRATIONS.filter((r) => r.userId === user.id)
    .map((r) => {
      const event = getEvent(r.eventSlug)!;
      return { ...r, event, distance: event?.distances.find((d) => d.id === r.distanceId) };
    })
    .filter((r) => r.event)
    .sort((a, b) => a.event.date.localeCompare(b.event.date));
}

export const isUpcoming = (r: RegistrationWithEvent) => r.event.date >= TODAY && r.status !== "cancelada";

export interface ResultWithEvent extends RaceResult {
  event: SportsEvent;
  distance: SportsEvent["distances"][number] | undefined;
}

export function resultsOf(user: User): ResultWithEvent[] {
  return RESULTS.filter((r) => r.name === user.name)
    .map((r) => {
      const event = getEvent(r.eventSlug)!;
      return { ...r, event, distance: event?.distances.find((d) => d.id === r.distanceId) };
    })
    .filter((r) => r.event)
    .sort((a, b) => b.event.date.localeCompare(a.event.date));
}

/** "01:23:45" → segundos */
export function toSeconds(hms: string) {
  return hms.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0);
}
