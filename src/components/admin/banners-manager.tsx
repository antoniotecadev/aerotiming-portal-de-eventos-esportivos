"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, GalleryHorizontalEnd, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { uid, useAdmin } from "./admin-store";
import { ConfirmModal, ImageUpload, PageTitle, Toggle } from "./admin-ui";

const KIND: Record<Banner["kind"], { label: string; tone: "brand" | "violet" | "blue" }> = {
  evento: { label: "Evento", tone: "brand" },
  publicidade: { label: "Publicidade", tone: "violet" },
  memoria: { label: "Memória", tone: "blue" },
};

export function BannersManager() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { data, moveBanner, toggleActive, remove } = useAdmin();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | "novo" | null>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);
  const banners = [...data.banners].sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (params.get("novo")) {
      setEditing("novo");
      router.replace("/admin/banners");
    }
  }, [params, router]);

  return (
    <>
      <PageTitle
        title="Banners do carrossel"
        description={`${banners.filter((b) => b.active).length} activos de ${banners.length}. A ordem aqui é a ordem na página inicial.`}
        actions={
          <Button onClick={() => setEditing("novo")}>
            <Plus /> Novo banner
          </Button>
        }
      />

      {banners.length === 0 ? (
        <EmptyState icon={<GalleryHorizontalEnd />} title="Sem banners" description="Crie o primeiro banner do carrossel da página inicial." />
      ) : (
        <ol className="space-y-3">
          {banners.map((b, i) => (
            <li key={b.id} className={cn("flex flex-col gap-4 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card sm:flex-row sm:items-center sm:p-4", !b.active && "opacity-70")}>
              <div className="flex items-center gap-3 sm:contents">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-700">{i + 1}</span>
                <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-ink-100 sm:w-56 sm:shrink-0">
                  {b.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image} alt="" className="absolute inset-0 size-full object-cover" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND[b.kind].tone}>{KIND[b.kind].label}</Badge>
                  {!b.active && <Badge tone="gray">Oculto</Badge>}
                </div>
                <p className="mt-1.5 truncate font-bold text-ink-900">{b.title}</p>
                <p className="truncate text-sm text-ink-500">{b.subtitle}</p>
                <p className="mt-1 truncate text-xs text-ink-400">
                  {b.ctaLabel} → {b.href}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3 sm:border-0 sm:pt-0">
                <Toggle
                  checked={b.active}
                  label={b.active ? "Visível" : "Oculto"}
                  onChange={() => {
                    toggleActive("banners", b.id);
                    toast({ title: b.active ? "Banner ocultado" : "Banner visível", description: b.title });
                  }}
                />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-9" disabled={i === 0} onClick={() => moveBanner(b.id, -1)} aria-label="Subir">
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9" disabled={i === banners.length - 1} onClick={() => moveBanner(b.id, 1)} aria-label="Descer">
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => setEditing(b)} aria-label="Editar">
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-9 text-red-600 hover:bg-red-50" onClick={() => setToDelete(b)} aria-label="Eliminar">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <BannerModal banner={editing} onClose={() => setEditing(null)} />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar banner?"
        description={<strong>{toDelete?.title}</strong>}
        onConfirm={() => {
          if (!toDelete) return;
          remove("banners", toDelete.id);
          toast({ title: "Banner eliminado" });
        }}
      />
    </>
  );
}

function BannerModal({ banner, onClose }: { banner: Banner | "novo" | null; onClose: () => void }) {
  const { data, create, update } = useAdmin();
  const toast = useToast();
  const isNew = banner === "novo";
  const blank = (): Banner => ({ id: uid("bn"), title: "", subtitle: "", image: "", ctaLabel: "Saber mais", href: "/eventos", kind: "evento", active: true, order: data.banners.length + 1 });
  const [form, setForm] = useState<Banner>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!banner) return;
    setForm(banner === "novo" ? blank() : { ...banner });
    setErrors({});
  }, [banner]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p: Partial<Banner>) => setForm((f) => ({ ...f, ...p }));

  function save() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Indique o título.";
    if (!form.image) e.image = "Carregue uma imagem.";
    if (!form.ctaLabel.trim()) e.ctaLabel = "Indique o texto do botão.";
    if (!form.href.trim() || !/^(\/|https?:\/\/)/.test(form.href)) e.href = "O link deve começar por / ou https://";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (isNew) create("banners", { ...form, order: Math.max(0, ...data.banners.map((b) => b.order)) + 1 });
    else update("banners", form.id, form);
    toast({ title: isNew ? "Banner criado" : "Banner actualizado", description: form.title });
    onClose();
  }

  return (
    <Modal
      open={!!banner}
      onClose={onClose}
      size="xl"
      title={isNew ? "Novo banner" : "Editar banner"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </>
      }
    >
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Field label="Imagem" required error={errors.image} hint="Recomendado 1920 × 840 px.">
            <ImageUpload value={form.image} onChange={(image) => set({ image })} aspect="aspect-[16/7]" />
          </Field>
          <Field label="Título" htmlFor="b-title" required error={errors.title}>
            <Input id="b-title" value={form.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
          </Field>
          <Field label="Subtítulo" htmlFor="b-sub">
            <Input id="b-sub" value={form.subtitle} onChange={(e) => set({ subtitle: e.target.value })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Texto do botão" htmlFor="b-cta" required error={errors.ctaLabel}>
              <Input id="b-cta" value={form.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} aria-invalid={!!errors.ctaLabel} />
            </Field>
            <Field label="Tipo" htmlFor="b-kind">
              <Select id="b-kind" value={form.kind} onChange={(e) => set({ kind: e.target.value as Banner["kind"] })}>
                <option value="evento">Evento</option>
                <option value="publicidade">Publicidade</option>
                <option value="memoria">Memória (edições anteriores)</option>
              </Select>
            </Field>
          </div>
          <Field label="Link" htmlFor="b-href" required error={errors.href} hint="Página interna (ex.: /eventos/…) ou endereço externo.">
            <Input id="b-href" value={form.href} onChange={(e) => set({ href: e.target.value })} list="b-href-events" aria-invalid={!!errors.href} />
            <datalist id="b-href-events">
              {data.events.map((ev) => (
                <option key={ev.id} value={`/eventos/${ev.slug}`}>
                  {ev.title}
                </option>
              ))}
            </datalist>
          </Field>
          <Toggle checked={form.active} onChange={(active) => set({ active })} label="Visível no carrossel" />
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-ink-800">Pré-visualização</p>
          <div className="lg:sticky lg:top-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-900 sm:aspect-[16/9]">
              {form.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image} alt="" className="absolute inset-0 size-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/50 to-transparent" />
              <div className="relative flex h-full max-w-[85%] flex-col justify-end p-5 sm:p-6">
                <Badge tone="dark" className="mb-2 self-start">
                  {KIND[form.kind].label}
                </Badge>
                <p className="text-xl leading-tight font-extrabold text-white sm:text-2xl">{form.title || "Título do banner"}</p>
                {(form.subtitle || !form.title) && <p className="mt-1 text-sm text-ink-200">{form.subtitle || "Subtítulo do banner"}</p>}
                <span className="mt-4 inline-flex h-10 items-center gap-2 self-start rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">
                  {form.ctaLabel || "Botão"} <ArrowRight className="size-4" />
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-500">Aproximação do aspecto na página inicial.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
