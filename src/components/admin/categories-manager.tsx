"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-store";
import { PageTitle } from "./admin-ui";

export function CategoriesManager() {
  const { data } = useAdmin();
  const [editing, setEditing] = useState<Category | null>(null);
  const count = (slug: string) => data.events.filter((e) => e.category === slug).length;

  return (
    <>
      <PageTitle title="Categorias" description="Modalidades usadas para organizar os eventos e os filtros do site." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.categories.map((c) => (
          <div key={c.slug} className="flex items-start gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", CATEGORY_TONE[c.slug])}>
              <CategoryIcon slug={c.slug} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-400">/{c.slug}</p>
                </div>
                <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-9" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                  <Pencil />
                </Button>
              </div>
              <p className="mt-2 text-sm text-ink-600">{c.description}</p>
              <p className="mt-3 text-xs font-semibold text-ink-500">
                {count(c.slug)} evento{count(c.slug) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-500">As categorias estão ligadas aos ícones e filtros do site; para criar uma nova modalidade, contacte a equipa técnica.</p>
      <CategoryModal category={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function CategoryModal({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { update } = useAdmin();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setError("");
  }, [category]);

  function save() {
    if (!category) return;
    if (!name.trim()) return setError("Indique o nome.");
    update("categories", category.slug, { name: name.trim(), description: description.trim() });
    toast({ title: "Categoria actualizada", description: name.trim() });
    onClose();
  }

  return (
    <Modal
      open={!!category}
      onClose={onClose}
      title="Editar categoria"
      description={category ? `/${category.slug}` : undefined}
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
        <Field label="Nome" htmlFor="c-name" required error={error}>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} />
        </Field>
        <Field label="Descrição" htmlFor="c-desc">
          <Textarea id="c-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
