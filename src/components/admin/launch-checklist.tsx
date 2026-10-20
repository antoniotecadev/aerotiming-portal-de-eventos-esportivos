import Link from "next/link";
import { ChevronRight, Rocket } from "lucide-react";
import { prisma } from "@/lib/db";
import type { PaymentAccounts } from "@/lib/types";
import { getCurrentUser } from "@/server/auth";
import { getSiteSettings } from "@/server/queries/site";

/**
 * "Antes de abrir ao público" (12.7): o que ainda falta configurar com dados reais.
 * Só o admin vê, e só enquanto houver alguma coisa por fazer.
 */
export async function LaunchChecklist() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;

  const [s, accountsRow, testAccounts] = await Promise.all([
    getSiteSettings(),
    prisma.siteSetting.findUnique({ where: { key: "payment_accounts" } }),
    prisma.profile.count({ where: { email: { endsWith: "@exemplo.ao" }, active: true } }),
  ]);
  const a = accountsRow?.value as Partial<PaymentAccounts> | undefined;
  const hasAccount = !!(a?.iban?.length || a?.multicaixaExpress?.phone || a?.kwik?.id);

  const todo = [
    !s.legalName || !s.nif ? { href: "/admin/definicoes", text: "Nome legal da empresa e NIF (aparecem nos termos e na privacidade)" } : null,
    !s.email || !s.phone ? { href: "/admin/definicoes", text: "E-mail e telefone de contacto (rodapé e página de contacto)" } : null,
    !hasAccount || !a?.whatsapp ? { href: "/admin/pagamentos/contas", text: "Contas de recebimento e WhatsApp para comprovativos" } : null,
    testAccounts ? { href: "/admin/utilizadores", text: `Desactivar ou apagar ${testAccounts === 1 ? "a conta de teste" : `as ${testAccounts} contas de teste`} (@exemplo.ao)` } : null,
  ].filter((x): x is { href: string; text: string } => !!x);
  if (!todo.length) return null;

  return (
    <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5" aria-labelledby="lancamento">
      <h2 id="lancamento" className="flex items-center gap-2 font-bold text-amber-900">
        <Rocket className="size-5" /> Antes de abrir ao público
      </h2>
      <p className="mt-1 text-sm text-amber-900/80">Falta preencher com os dados reais:</p>
      <ul className="mt-3 space-y-1">
        {todo.map((t) => (
          <li key={t.text}>
            <Link href={t.href} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold text-amber-950 hover:bg-amber-100">
              {t.text} <ChevronRight className="size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
