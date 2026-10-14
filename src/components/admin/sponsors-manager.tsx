"use client";

import { useEffect, useState } from "react";
import { Handshake, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type { Sponsor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { uid, useAdmin } from "./admin-store";
import { ConfirmModal, ImageUpload, PageTitle, Toggle } from "./admin-ui";

const TIER: Record<Sponsor["tier"], { label: string; tone: "brand" | "blue" | "gray" }> = {
  principal: { label: "Principal", tone: "brand" },
  oficial: { label: "Oficial", tone: "blue" },
  apoio: { label: "Apoio", tone: "gray" },
};

type TierFilter = "todos" | Sponsor["tier"];

export function SponsorsManager() {
  const { data, toggleActive, remove } = useAdmin();
  const toast = useToast();
  const [tier, setTier] = useState<TierFilter>("todos");
  const [editing, setEditing] = useState<Sponsor | "novo" | null>(null);
  const [toDelete, setToDelete] = useState<Sponsor | null>(null);

  const order = { principal: 0, oficial: 1, apoio: 2 };
  const list = data.sponsors.filter((s) => tier === "todos" || s.tier === tier).sort((a, b) => order[a.tier] - order[b.tier] || a.name.localeCompare(b.name));
  const usedIn = (id: string) => data.events.filter((e) => e.sponsorIds.includes(id)).length;

  return (
    <>
      <PageTitle
        title="Patrocinadores"
        description="Logótipos mostrados no site e nas páginas dos eventos."
        actions={
          <Button onClick={() => setEditing("novo")}>
            <Plus /> Adicionar patrocinador
          </Button>
        }
      />
      <Tabs<TierFilter>
        className="mb-5"
        value={tier}
        onChange={setTier}
        items={[
          { id: "todos", label: "Todos", count: data.sponsors.length },
          ...(Object.keys(TIER) as Sponsor["tier"][]).map((t) => ({ id: t, label: TIER[t].label, count: data.sponsors.filter((s) => s.tier === t).length })),
        ]}
      />

      {list.length === 0 ? (
        <EmptyState icon={<Handshake />} title="Sem patrocinadores nesta categoria" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((s) => (
            <div key={s.id} className={cn("flex flex-col rounded-2xl border border-ink-200/70 bg-white shadow-card", !s.active && "opacity-70")}>
              <div className="flex h-32 items-center justify-center rounded-t-2xl bg-ink-50 p-6">
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo} alt={s.name} className={cn("max-h-full max-w-full object-contain", !s.active && "grayscale")} />
                ) : (
                  <Handshake className="size-8 text-ink-300" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-ink-900">{s.name}</p>
                  <Badge tone={TIER[s.tier].tone}>{TIER[s.tier].label}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-ink-500">
                  {usedIn(s.id)} evento{usedIn(s.id) === 1 ? "" : "s"}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-3">
                  <Toggle
                    checked={s.active}
                    label={s.active ? "Activo" : "Inactivo"}
                    onChange={() => {
                      toggleActive("sponsors", s.id);
                      toast({ title: s.active ? "Patrocinador desactivado" : "Patrocinador activado", description: s.name });
                    }}
                  />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-9" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-9 text-red-600 hover:bg-red-50" onClick={() => setToDelete(s)} aria-label={`Eliminar ${s.name}`}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SponsorModal sponsor={editing} onClose={() => setEditing(null)} />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar patrocinador?"
        description={
          <>
            <strong>{toDelete?.name}</strong> será removido{toDelete && usedIn(toDelete.id) > 0 ? ` e deixará de aparecer em ${usedIn(toDelete.id)} eventos` : ""}.
          </>
        }
        onConfirm={() => {
          if (!toDelete) return;
          remove("sponsors", toDelete.id);
          toast({ title: "Patrocinador eliminado", description: toDelete.name });
        }}
      />
    </>
  );
}

function SponsorModal({ sponsor, onClose }: { sponsor: Sponsor | "novo" | null; onClose: () => void }) {
  const { create, update } = useAdmin();
  const toast = useToast();
  const isNew = sponsor === "novo";
  const blank = (): Sponsor => ({ id: uid("sp"), name: "", logo: "", url: "", tier: "apoio", active: true });
  const [form, setForm] = useState<Sponsor>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sponsor) return;
    setForm(sponsor === "novo" ? blank() : { ...sponsor });
    setErrors({});
  }, [sponsor]);

  const set = (p: Partial<Sponsor>) => setForm((f) => ({ ...f, ...p }));

  function save() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Indique o nome.";
    if (!form.logo) e.logo = "Carregue o logótipo.";
    if (form.url && form.url !== "#" && !/^https?:\/\//.test(form.url)) e.url = "O site deve começar por https://";
    setErrors(e);
    if (Object.keys(e).length) return;
    const final = { ...form, name: form.name.trim(), url: form.url || "#" };
    if (isNew) create("sponsors", final);
    else update("sponsors", form.id, final);
    toast({ title: isNew ? "Patrocinador adicionado" : "Patrocinador actualizado", description: final.name });
    onClose();
  }

  return (
    <Modal
      open={!!sponsor}
      onClose={onClose}
      title={isNew ? "Adicionar patrocinador" : "Editar patrocinador"}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-5 p-5 sm:p-6">
        <Field label="Logótipo" required error={errors.logo} hint="De preferência SVG ou PNG com fundo transparente.">
          <ImageUpload value={form.logo} onChange={(logo) => set({ logo })} aspect="aspect-[3/1]" fit="contain" label="Carregar logótipo" />
        </Field>
        <Field label="Nome" htmlFor="s-name" required error={errors.name}>
          <Input id="s-name" value={form.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nível" htmlFor="s-tier">
            <Select id="s-tier" value={form.tier} onChange={(e) => set({ tier: e.target.value as Sponsor["tier"] })}>
              <option value="principal">Principal</option>
              <option value="oficial">Oficial</option>
              <option value="apoio">Apoio</option>
            </Select>
          </Field>
          <Field label="Site" htmlFor="s-url" error={errors.url}>
            <Input id="s-url" type="url" value={form.url === "#" ? "" : form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://" aria-invalid={!!errors.url} />
          </Field>
        </div>
        <Toggle checked={form.active} onChange={(active) => set({ active })} label="Activo (visível no site)" />
      </div>
    </Modal>
  );
}
