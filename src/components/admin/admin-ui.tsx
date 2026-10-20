"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Search, TriangleAlert, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { uploadFile } from "@/server/actions/uploads";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-ink-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "brand" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: "brand" | "green" | "amber" | "blue" | "ink" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
    ink: "bg-ink-100 text-ink-700",
  };
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-600">{label}</p>
        {icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", tones[tone])}>{icon}</span>}
      </div>
      <p className="tabular mt-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Pesquisar…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-xl border border-ink-200 bg-white pr-3 pl-10 text-[15px] text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
      />
    </div>
  );
}

/** Select compacto para barras de filtros. */
export function FilterSelect({ value, onChange, children, label, className }: { value: string; onChange: (v: string) => void; children: React.ReactNode; label: string; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn("h-11 min-w-0 rounded-xl border border-ink-200 bg-white px-3 text-[15px] text-ink-900 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none", className)}
    >
      {children}
    </select>
  );
}

/** Contentor de tabela: faz scroll horizontal dentro do cartão, nunca da página. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const th = "px-4 py-3 text-left text-xs font-bold tracking-wide whitespace-nowrap text-ink-500 uppercase";
export const td = "px-4 py-3 align-middle text-sm text-ink-700";

export function Toggle({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex items-center gap-2.5 text-sm font-semibold text-ink-700", className)}
    >
      <span className={cn("relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-ink-300")}>
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </span>
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4 p-6">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600")}>
          <TriangleAlert className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          {description && <div className="mt-1 text-ink-600">{description}</div>}
        </div>
      </div>
    </Modal>
  );
}

/** Envia o ficheiro para o Supabase Storage (bucket "media") e devolve o URL público. */
async function sendFile(file: File, kind: "image" | "document", folder: string) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  fd.set("folder", folder);
  return uploadFile(fd);
}

/** Upload de imagem para o Supabase Storage. */
export function ImageUpload({
  value,
  onChange,
  label = "Carregar imagem",
  aspect = "aspect-video",
  className,
  fit = "cover",
  folder = "imagens",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: string;
  className?: string;
  fit?: "cover" | "contain";
  folder?: string;
}) {
  const id = useId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 transition-colors hover:border-brand-400",
          aspect,
        )}
      >
        {busy ? (
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-600"><Loader2 className="size-5 animate-spin" /> A carregar…</span>
        ) : value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain p-4")} />
            <span className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="mr-2 size-4" /> Substituir
            </span>
          </>
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-ink-500">
            <ImagePlus className="size-7 text-ink-400" />
            <span className="font-semibold text-ink-700">{label}</span>
            <span>JPG, PNG ou SVG</span>
          </span>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const res = await sendFile(f, "image", folder);
          setBusy(false);
          if (!res.ok) return toast({ title: "Não foi possível carregar", description: res.error, tone: "error" });
          onChange(res.url);
        }}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-red-600">
          <X className="size-4" /> Remover
        </button>
      )}
    </div>
  );
}

/** Upload de ficheiro (PDF, GPX…) para o Supabase Storage. Devolve nome + URL público. */
export function FileUpload({
  accept,
  value,
  onChange,
  label,
}: {
  accept: string;
  value?: { name: string; url: string } | null;
  onChange: (v: { name: string; url: string } | null) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-3">
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} {busy ? "A carregar…" : label}
      </Button>
      {value ? (
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
          <span className="truncate font-semibold">{value.name}</span>
          <button type="button" onClick={() => onChange(null)} className="text-ink-400 hover:text-red-600" aria-label="Remover ficheiro">
            <X className="size-4" />
          </button>
        </span>
      ) : (
        <span className="text-sm text-ink-500">Nenhum ficheiro seleccionado</span>
      )}
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          const res = await sendFile(f, "document", "documentos");
          setBusy(false);
          if (!res.ok) return toast({ title: "Não foi possível carregar", description: res.error, tone: "error" });
          onChange({ name: res.name, url: res.url });
        }}
      />
    </div>
  );
}

export function Pagination({ page, pages, onChange, total, perPage }: { page: number; pages: number; onChange: (p: number) => void; total: number; perPage: number }) {
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm text-ink-600">
      <span className="tabular">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft />
        </Button>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Página seguinte">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/** Menu de acções em linha (três pontos). */
export function RowMenu({ trigger, children, label = "Mais acções" }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; label?: string }) {
  // Posição fixa (calculada a partir do botão) para o menu não ser cortado pelo scroll da tabela
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const open = !!pos;
  const close = () => setPos(null);

  function toggle() {
    if (open) return close();
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = window.innerHeight - r.bottom < 220;
    setPos(up ? { bottom: window.innerHeight - r.top + 4, right: window.innerWidth - r.right } : { top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const onMove = () => setPos(null);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);
  return (
    <div ref={ref} className="inline-block">
      <button ref={btnRef} type="button" onClick={toggle} aria-label={label} aria-expanded={open} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900">
        {trigger}
      </button>
      {pos && (
        <div
          className="fixed z-50 w-56 animate-pop-in overflow-hidden rounded-xl border border-ink-200 bg-white py-1 text-left shadow-lift"
          style={{ top: pos.top, bottom: pos.bottom, right: pos.right }}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onClick, icon, children, danger, disabled }: { onClick: () => void; icon?: React.ReactNode; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium disabled:opacity-40 [&_svg]:size-4",
        danger ? "text-red-600 hover:bg-red-50" : "text-ink-700 hover:bg-ink-50",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Painel/secção de formulário. */
export function FormSection({ title, description, children, id, action }: { title: string; description?: string; children: React.ReactNode; id?: string; action?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-ink-200/70 bg-white shadow-card">
      <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}
