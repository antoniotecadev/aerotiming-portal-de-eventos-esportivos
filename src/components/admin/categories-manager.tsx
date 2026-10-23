"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { categoryTone, CategoryIcon } from "@/components/events/category-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { slugify, useAdmin } from "./admin-store";
import { PageTitle } from "./admin-ui";

export function CategoriesManager() {
  const { data, remove } = useAdmin();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const count = (slug: string) => data.events.filter((e) => e.category === slug).length;

  return (
    <>
      <PageTitle title="Categorias" description="Modalidades usadas para organizar os eventos e os filtros do site." />
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Nova categoria</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.categories.map((c) => (
          <div key={c.slug} className="flex items-start gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", categoryTone(c.slug))}>
              <CategoryIcon slug={c.slug} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold text-ink-900">{c.name}</p><p className="text-xs text-ink-400">/{c.slug}</p></div>
                <div className="-mt-1 -mr-2 flex">
                  <Button variant="ghost" size="icon" className="size-9" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}><Pencil /></Button>
                  <Button variant="ghost" size="icon" className="size-9 text-red-700" disabled={count(c.slug) > 0} onClick={() => {
                    if (window.confirm(`Eliminar a categoria “${c.name}”?`)) remove("categories", c.slug);
                  }} aria-label={`Eliminar ${c.name}`} title={count(c.slug) ? "Remova primeiro os eventos associados" : "Eliminar categoria"}><Trash2 /></Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-600">{c.description}</p>
              <p className="mt-3 text-xs font-semibold text-ink-500">{count(c.slug)} evento{count(c.slug) === 1 ? "" : "s"}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-500">Categorias com eventos associados não podem ser eliminadas.</p>
      <CategoryModal category={editing} onClose={() => setEditing(null)} />
      <CategoryModal category={null} creating={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CategoryModal({ category, creating = false, onClose }: { category: Category | null; creating?: boolean; onClose: () => void }) {
  const { update, create, data } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setSlug(category?.slug ?? "");
    setError("");
  }, [category, creating]);

  function save() {
    if (!name.trim()) return setError("Indique o nome.");
    if (creating) {
      const newSlug = slugify(slug || name);
      if (!newSlug) return setError("Indique um nome válido para o endereço.");
      if (data.categories.some((c) => c.slug === newSlug)) return setError("Já existe uma categoria com este endereço.");
      create("categories", { slug: newSlug, name: name.trim(), description: description.trim() });
      toast({ title: "Categoria criada", description: name.trim() });
    } else {
      if (!category) return;
      update("categories", category.slug, { name: name.trim(), description: description.trim() });
      toast({ title: "Categoria actualizada", description: name.trim() });
    }
    onClose();
  }

  return (
    <Modal open={creating || !!category} onClose={onClose} title={creating ? "Nova categoria" : "Editar categoria"}
      description={category ? `/${category.slug}` : "O endereço será criado a partir do nome."}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar</Button></>}>
      <div className="space-y-5 p-5 sm:p-6">
        <Field label="Nome" htmlFor="c-name" required error={error}>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} />
        </Field>
        {creating && <Field label="Endereço (slug)" htmlFor="c-slug" hint="Pode deixar em branco para usar o nome.">
          <Input id="c-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="ex.: corrida-de-montanha" />
        </Field>}
        <Field label="Descrição" htmlFor="c-desc">
          <Textarea id="c-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
