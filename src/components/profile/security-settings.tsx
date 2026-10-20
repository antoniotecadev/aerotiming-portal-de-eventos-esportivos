"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, KeyRound, LogOut, Mail, MessageSquareText, Save, Trash2, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { WhatsAppIcon } from "@/components/layout/social-icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { changePassword, deleteAccount, updateNotifications } from "@/server/actions/profile";

// "Novas provas e promoções" ainda não tem coluna na BD: fica no browser (Fase 11).
const PREFS_KEY = "aerotiming:notificacoes";
type Prefs = { sms: boolean; email: boolean; whatsapp: boolean; news: boolean };
const DEFAULT_PREFS: Prefs = { sms: true, email: true, whatsapp: false, news: false };

function Toggle({ checked, onChange, title, hint, icon }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string; icon: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 hover:bg-ink-50">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink-900">{title}</span>
        <span className="block text-sm text-ink-500">{hint}</span>
      </span>
      <input type="checkbox" className="size-6 shrink-0 rounded-md accent-brand-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SecuritySettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, ...user?.notifications });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs((p) => ({ ...p, news: !!JSON.parse(raw).news }));
    } catch {}
  }, []);
  const [pending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Segurança e notificações</h2>
        <p className="text-ink-600">Mude a palavra-passe e escolha como quer receber os nossos avisos.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="size-5 text-brand-600" /> Mudar palavra-passe</span>} />
          <form
            className="space-y-5 p-5 sm:p-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setPwError(null);
              if (pw !== confirm) return setPwError("As duas novas palavras-passe não são iguais.");
              startTransition(async () => {
                const res = await changePassword({ current, password: pw });
                if (!res.ok) return setPwError(res.error);
                setCurrent("");
                setPw("");
                setConfirm("");
                toast({ title: "Palavra-passe alterada", description: "Use a nova palavra-passe da próxima vez que entrar." });
              });
            }}
          >
            <FormError>{pwError}</FormError>
            <Field label="Palavra-passe actual" htmlFor="current-password">
              <PasswordInput id="current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </Field>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-semibold text-ink-800">
                Nova palavra-passe
              </label>
              <PasswordInput id="new-password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <PasswordStrength value={pw} />
            </div>
            <Field label="Repita a nova palavra-passe" htmlFor="confirm-password">
              <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              <Save /> {pending ? "A guardar…" : "Guardar nova palavra-passe"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title={<span className="inline-flex items-center gap-2"><Bell className="size-5 text-brand-600" /> Notificações</span>}
            description="Avisos de pagamento, levantamento do kit e resultados."
          />
          <div className="space-y-1 p-3 sm:p-4">
            <Toggle icon={<MessageSquareText />} title="SMS" hint={user.phone ? `Para ${user.phone}` : "Adicione o telemóvel em “Os meus dados”"} checked={prefs.sms} onChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
            <Toggle icon={<Mail />} title="E-mail" hint={`Para ${user.email}`} checked={prefs.email} onChange={(v) => setPrefs((p) => ({ ...p, email: v }))} />
            <Toggle icon={<WhatsAppIcon />} title="WhatsApp" hint="Mensagens rápidas no seu telemóvel" checked={prefs.whatsapp} onChange={(v) => setPrefs((p) => ({ ...p, whatsapp: v }))} />
            <div className="my-2 h-px bg-ink-100" />
            <Toggle icon={<Bell />} title="Novas provas e promoções" hint="No máximo 2 mensagens por mês" checked={prefs.news} onChange={(v) => setPrefs((p) => ({ ...p, news: v }))} />
          </div>
          <div className="border-t border-ink-100 px-5 py-4 sm:px-6">
            {!prefs.sms && !prefs.email && !prefs.whatsapp && (
              <p className="mb-3 text-sm text-amber-800">Atenção: sem nenhum canal activo não vai receber avisos importantes sobre as suas provas.</p>
            )}
            <Button
              variant="dark"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                try {
                  localStorage.setItem(PREFS_KEY, JSON.stringify({ news: prefs.news }));
                } catch {}
                startTransition(async () => {
                  const res = await updateNotifications(prefs);
                  if (!res.ok) return toast({ title: "Não foi possível guardar", description: res.error, tone: "error" });
                  toast({ title: "Preferências guardadas" });
                });
              }}
            >
              <Save /> Guardar preferências
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-bold text-ink-900">Terminar sessão</p>
            <p className="text-[15px] text-ink-600">Saia da conta neste dispositivo (por exemplo, num computador partilhado).</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
          >
            <LogOut /> Sair da conta
          </Button>
        </div>
      </Card>

      <Card className="border-red-200">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 size-6 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-700">Apagar conta</p>
              <p className="text-[15px] text-ink-600">Apaga os seus dados pessoais. Os resultados de provas passadas continuam públicos, mas sem ligação à conta. Não é possível desfazer.</p>
            </div>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Apagar a minha conta
          </Button>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteText("");
        }}
        size="sm"
        title="Apagar a conta de vez?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Não, voltar
            </Button>
            <Button
              variant="danger"
              disabled={deleteText.trim().toUpperCase() !== "APAGAR" || pending}
              onClick={() => {
                setDeleteError(null);
                startTransition(async () => {
                  const res = await deleteAccount({ confirm: deleteText });
                  if (!res.ok) return setDeleteError(res.error);
                  toast({ title: "Conta apagada", description: "Lamentamos vê-lo(a) partir. Pode criar uma nova conta quando quiser." });
                  await logout();
                  router.push("/");
                });
              }}
            >
              <Trash2 /> Apagar conta
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-5 sm:p-6">
          <FormError>{deleteError}</FormError>
          <p className="text-[15px] text-ink-700">
            As suas inscrições activas serão canceladas e <strong>o valor pago não é devolvido</strong>. Esta acção não pode ser desfeita.
          </p>
          <Field label='Para confirmar, escreva "APAGAR"' htmlFor="confirm-delete">
            <Input id="confirm-delete" autoComplete="off" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="APAGAR" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
