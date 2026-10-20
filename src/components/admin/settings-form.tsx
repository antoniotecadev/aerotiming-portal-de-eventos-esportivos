"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { type SiteSettings, useAdmin } from "./admin-store";
import { FormSection, PageTitle } from "./admin-ui";

type Key = keyof SiteSettings;

export function SettingsForm() {
  const { data, saveSettings } = useAdmin();
  const toast = useToast();
  const [form, setForm] = useState<SiteSettings>(data.settings);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});

  useEffect(() => setForm(data.settings), [data.settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(data.settings);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const err: Partial<Record<Key, string>> = {};
    if (!form.siteName.trim()) err.siteName = "Indique o nome do site.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = "Indique um e-mail válido.";
    if (form.privacyEmail && !/^\S+@\S+\.\S+$/.test(form.privacyEmail)) err.privacyEmail = "Indique um e-mail válido.";
    if (form.nif && !/^[0-9A-Z]{9,14}$/i.test(form.nif.replace(/\s/g, ""))) err.nif = "O NIF tem entre 9 e 14 algarismos ou letras, sem espaços.";
    if (form.phone.replace(/\D/g, "").length < 9) err.phone = "Indique um número válido.";
    if (form.whatsapp && form.whatsapp.replace(/\D/g, "").length < 9) err.whatsapp = "Indique um número válido, com indicativo (+244).";
    (["facebook", "instagram", "youtube", "tiktok", "linkedin"] as Key[]).forEach((k) => {
      if (form[k] && !/^https?:\/\//.test(form[k])) err[k] = "O endereço deve começar por https://";
    });
    if (form.multicaixaEntity && !/^\d{5}$/.test(form.multicaixaEntity)) err.multicaixaEntity = "A entidade tem 5 dígitos.";
    const iban = form.iban.replace(/\s/g, "");
    if (iban && !/^AO\d{23}$/i.test(iban)) err.iban = "O IBAN angolano tem o formato AO06 seguido de 21 dígitos (25 caracteres).";
    setErrors(err);
    if (Object.keys(err).length) {
      toast({ tone: "error", title: "Há campos por corrigir" });
      return;
    }
    saveSettings(form);
    toast({ title: "Definições guardadas" });
  }

  const f = (k: Key, label: string, opts: { type?: string; placeholder?: string; hint?: string; required?: boolean; className?: string } = {}) => (
    <Field label={label} htmlFor={`st-${k}`} error={errors[k]} hint={opts.hint} required={opts.required} className={opts.className}>
      <Input id={`st-${k}`} type={opts.type ?? "text"} value={form[k]} placeholder={opts.placeholder} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} aria-invalid={!!errors[k]} />
    </Field>
  );

  return (
    <form onSubmit={save} className="pb-4">
      <PageTitle title="Definições" description="Informação geral do site, contactos e dados de pagamento." />
      <div className="space-y-6">
        <FormSection title="Site">
          <div className="grid gap-5 sm:grid-cols-2">
            {f("siteName", "Nome do site", { required: true })}
            {f("tagline", "Slogan")}
          </div>
        </FormSection>
        <FormSection title="Empresa" description="Aparece nos termos e condições e na política de privacidade.">
          <div className="grid gap-5 sm:grid-cols-2">
            {f("legalName", "Nome legal da empresa", { placeholder: "Ex.: ConexãoSport, Lda.", hint: "Se ficar vazio, usa o nome do site." })}
            {f("nif", "NIF", { placeholder: "Ex.: 5417000000" })}
            {f("privacyEmail", "E-mail para dados pessoais", { type: "email", placeholder: "privacidade@…", hint: "Pedidos ao abrigo da Lei n.º 22/11. Se ficar vazio, usa o e-mail geral." })}
          </div>
        </FormSection>
        <FormSection title="Contactos" description="Aparecem no rodapé, na página de ajuda e nos e-mails aos atletas.">
          <div className="grid gap-5 sm:grid-cols-2">
            {f("email", "E-mail", { type: "email", required: true })}
            {f("phone", "Telefone / telemóvel", { type: "tel", required: true, placeholder: "+244 9XX XXX XXX" })}
            {f("whatsapp", "WhatsApp", { type: "tel", placeholder: "+244 9XX XXX XXX", hint: "Número usado no botão flutuante de WhatsApp." })}
            {f("address", "Morada")}
          </div>
        </FormSection>
        <FormSection title="Redes sociais" description="Aparecem no rodapé. Deixe em branco as que não usa.">
          <div className="grid gap-5 sm:grid-cols-2">
            {f("facebook", "Facebook", { type: "url", placeholder: "https://facebook.com/…" })}
            {f("instagram", "Instagram", { type: "url", placeholder: "https://instagram.com/…" })}
            {f("youtube", "YouTube", { type: "url", placeholder: "https://youtube.com/@…" })}
            {f("tiktok", "TikTok", { type: "url", placeholder: "https://tiktok.com/@…" })}
            {f("linkedin", "LinkedIn", { type: "url", placeholder: "https://linkedin.com/company/…" })}
          </div>
        </FormSection>
        <FormSection title="Pagamentos" description="Contas de recebimento e WhatsApp para comprovativos.">
          <p className="text-[15px] text-ink-600">
            As contas (IBAN, Multicaixa Express, KWiK) e o WhatsApp para comprovativos são definidos em{" "}
            <a href="/admin/pagamentos/contas" className="font-semibold text-brand-700 hover:underline">Pagamentos → Contas e WhatsApp</a>.
          </p>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-sm text-ink-500">Alterações por guardar</span>}
          <Button variant="ghost" disabled={!dirty} onClick={() => (setForm(data.settings), setErrors({}))}>
            Descartar
          </Button>
          <Button type="submit" disabled={!dirty}>
            <Save /> Guardar
          </Button>
        </div>
      </div>

    </form>
  );
}
