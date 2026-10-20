import "server-only";
import { prisma } from "@/lib/db";
import type { User } from "@/lib/types";

/** Admin, ou organizador na equipa do evento (event_staff). */
export async function canManageEvent(user: User | null, eventId: string) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "organizador") return false;
  return !!(await prisma.eventStaff.findFirst({ where: { eventId, profileId: user.id, role: "organizador" }, select: { eventId: true } }));
}

/** Pode fazer check-in de kits: admin, ou qualquer pessoa na equipa do evento (organizador ou staff). */
export async function canCheckIn(user: User | null, eventId: string) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return !!(await prisma.eventStaff.findFirst({ where: { eventId, profileId: user.id }, select: { eventId: true } }));
}

/** Eventos em que o utilizador pode fazer check-in (próximos e de hoje). */
export async function checkInEventsFor(user: User, fromDay: string) {
  return prisma.event.findMany({
    where: {
      date: { gte: new Date(`${fromDay}T00:00:00Z`) },
      status: { notIn: ["rascunho", "cancelado"] },
      ...(user.role === "admin" ? {} : { staff: { some: { profileId: user.id } } }),
    },
    select: { id: true, slug: true, title: true, date: true, kitLocation: true },
    orderBy: { date: "asc" },
  });
}
