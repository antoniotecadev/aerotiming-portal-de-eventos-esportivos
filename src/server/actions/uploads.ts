"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasRole } from "../auth";
import { hit } from "../rate-limit";

const BUCKET = "media"; // público (só leitura); escrita apenas pelo servidor
const MAX_MB = { image: 5, document: 10 } as const;

/**
 * Tipo real do ficheiro pelos primeiros bytes (12.4, M6) — não se confia no tipo que o browser declara.
 * SVG não é aceite: pode conter JavaScript e seria servido a partir do domínio do Supabase.
 */
function detect(bytes: Uint8Array, name: string): { type: string; ext: string; kind: "image" | "document" } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg", kind: "image" };
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { type: "image/png", ext: "png", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { type: "image/webp", ext: "webp", kind: "image" };
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return { type: "image/avif", ext: "avif", kind: "image" };
  if (ascii(0, 5) === "%PDF-") return { type: "application/pdf", ext: "pdf", kind: "document" };
  // GPX: texto XML com um elemento <gpx
  const head = new TextDecoder().decode(bytes.slice(0, 2048)).replace(/^﻿/, "").trimStart();
  if (name.toLowerCase().endsWith(".gpx") && (head.startsWith("<?xml") || head.startsWith("<gpx")) && /<gpx[\s>]/.test(head)) {
    return { type: "application/gpx+xml", ext: "gpx", kind: "document" };
  }
  return null;
}

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
  const limit = await hit({ name: "upload:user", max: 60, windowSec: 60 * 60 }, user!.id);
  if (!limit.ok) return { ok: false, error: "Carregou muitos ficheiros seguidos. Tente de novo daqui a pouco." };

  const file = formData.get("file");
  const kind = formData.get("kind") === "document" ? "document" : "image";
  const folder = String(formData.get("folder") ?? "geral").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "geral";
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Escolha um ficheiro." };
  if (file.size > MAX_MB[kind] * 1024 * 1024) return { ok: false, error: `O ficheiro é demasiado grande (máximo ${MAX_MB[kind]} MB).` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const found = detect(bytes, file.name);
  if (!found || found.kind !== kind) return { ok: false, error: kind === "image" ? "Use uma imagem JPG, PNG, WEBP ou AVIF." : "Use um ficheiro PDF ou GPX." };

  await ensureBucket();
  const base = file.name.toLowerCase().normalize("NFD").replace(/\.[^.]*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(-50) || "ficheiro";
  const path = `${folder}/${randomUUID()}-${base}.${found.ext}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: found.type, upsert: false });
  if (error) return { ok: false, error: "Não foi possível carregar o ficheiro. Tente novamente." };
  return { ok: true, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, name: file.name };
}
