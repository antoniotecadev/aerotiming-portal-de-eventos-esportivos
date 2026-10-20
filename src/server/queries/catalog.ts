import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { mapBanner, mapCategory, mapSponsor } from "../mappers";

export const listCategories = cache(async () => {
  await connection();
  const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(mapCategory);
});

export async function listActiveSponsors() {
  await connection();
  const rows = await prisma.sponsor.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return rows.map(mapSponsor);
}

/** Banners activos e dentro do período de publicação (se definido). */
export async function listActiveBanners() {
  await connection();
  const now = new Date();
  const rows = await prisma.banner.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(mapBanner);
}
