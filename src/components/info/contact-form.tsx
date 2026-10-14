"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PhoneInput, isValidAoPhone, stripPrefix } from "@/components/auth/phone-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const SUBJECTS = [
  { id: "inscricao", label: "Dúvida sobre uma inscrição" },
  { id: "pagamento", label: "Problema com um pagamento" },
  { id: "resultados", label: "Correcção de resultados" },
  { id: "organizar", label: "Quero organizar um evento" },
  { id: "patrocinio", label: "Patrocínios e publicidade" },
  { id: "outro", label: "Outro assunto" },
];

export function ContactForm() {
  const { user } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const initialSubject = SUBJECTS.some((s) => s.id === params.get("assunto")) ? params.get("assunto")! : "inscricao";

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user ? stripPrefix(user.phone) : "");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Preenche com os dados da conta quando a sessão termina de carregar
  useEffect(() => {
    if (!user) return;
    setName((v) => v || user.name);
    setEmail((v) => v || user.email);
    setPhone((v) => v || stripPrefix(user.phone));
  }, [user]);

  if (sent)
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </div>
        <h3 className="mt-4 text-2xl font-extrabold text-ink-900">Mensagem enviada!</h3>
        <p className="mt-2 max-w-sm text-ink-600">Obrigado, {name.split(" ")[0]}. Vamos responder para {email} em menos de 1 dia útil.</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setMessage("");
          }}
        >
          Enviar outra mensagem
        </Button>
      </div>
    );

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const err: Record<string, string> = {};
        if (name.trim().length < 3) err.name = "Escreva o seu nome.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) err.email = "Este e-mail não parece correcto. Ex.: nome@exemplo.ao";
        if (phone && !isValidAoPhone(phone)) err.phone = "9 dígitos, a começar por 9.";
        if (message.trim().length < 10) err.message = "Conte-nos um pouco mais (pelo menos 10 letras).";
        setErrors(err);
        if (Object.keys(err).length) return;
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          setSent(true);
          toast({ title: "Mensagem enviada", description: "Respondemos em menos de 1 dia útil." });
        }, 600);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="O seu nome" htmlFor="c-name" required error={errors.name}>
          <Input id="c-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
        </Field>
        <Field label="E-mail" htmlFor="c-email" required error={errors.email} hint="Respondemos para este e-mail.">
          <Input id="c-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email || undefined} />
        </Field>
        <Field label="Telemóvel (opcional)" htmlFor="c-phone" error={errors.phone} hint="Se preferir que lhe liguemos.">
          <PhoneInput id="c-phone" value={phone} onChange={setPhone} aria-invalid={!!errors.phone || undefined} />
        </Field>
        <Field label="Assunto" htmlFor="c-subject">
          <Select id="c-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Mensagem"
        htmlFor="c-message"
        required
        error={errors.message}
        hint={subject === "organizar" ? "Diga-nos o tipo de prova, a data, o local e quantos participantes espera." : "Se for sobre uma inscrição, indique o código (ex.: AT-2026-01234)."}
      >
        <Textarea id="c-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message || undefined} />
      </Field>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
        <Send /> {loading ? "A enviar…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}
