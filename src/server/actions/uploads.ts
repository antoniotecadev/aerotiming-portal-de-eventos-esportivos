"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasRole } from "../auth";

const BUCKET = "media"; // público (só leitura); escrita apenas pelo servidor
const LIMITS: Record<string, { types: RegExp; maxMb: number }> = {
  image: { types: /^image\/(jpeg|png|webp|avif|svg\+xml)$/, maxMb: 5 },
  document: { types: /^(application\/pdf|application\/gpx\+xml|application\/xml|text\/xml|application\/octet-stream)$/, maxMb: 10 },
};

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "10MB" });
  bucketReady = true;
}

/** Carrega um ficheiro do painel para o Supabase Storage e devolve o URL público (tarefas 9.1–9.2). */
export async function uploadFile(formData: FormData): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!hasRole(user, "admin", "organizador")) return { ok: false, error: "Sem permissão para carregar ficheiros." };
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "image");
  const folder = String(formData.get("folder") ?? "geral").replace(/[^a-z0-9-]/gi, "") || "geral";
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha um ficheiro." };
  const rule = LIMITS[kind] ?? LIMITS.image;
  const isGpx = file.name.toLowerCase().endsWith(".gpx");
  if (!rule.types.test(file.type) && !(kind === "document" && isGpx)) return { ok: false, error: kind === "image" ? "Use uma imagem JPG, PNG, WEBP ou SVG." : "Use um ficheiro PDF ou GPX." };
  if (file.size > rule.maxMb * 1024 * 1024) return { ok: false, error: `O ficheiro é demasiado grande (máximo ${rule.maxMb} MB).` };

  await ensureBucket();
  const safe = file.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9.]+/g, "-").slice(-60);
  const path = `${folder}/${randomUUID()}-${safe}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return { ok: false, error: "Não foi possível carregar o ficheiro. Tente novamente." };
  return { ok: true, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, name: file.name };
}
