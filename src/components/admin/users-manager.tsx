"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Trash2, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PROVINCES } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Gender, TShirtSize, User, UserRole } from "@/lib/types";
import { normalize, uid, useAdmin } from "./admin-store";
import { ConfirmModal, FilterSelect, PageTitle, Pagination, SearchInput, TableWrap, Toggle, td, th } from "./admin-ui";

const ROLE: Record<UserRole, { label: string; tone: "gray" | "blue" | "brand" }> = {
  atleta: { label: "Atleta", tone: "gray" },
  organizador: { label: "Organizador", tone: "blue" },
  admin: { label: "Administrador", tone: "brand" },
};

const PER_PAGE = 20;

export function UsersManager() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const { data, toggleActive, remove } = useAdmin();
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | "novo" | null>(null);
  const [toDelete, setToDelete] = useState<User | null>(null);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);
  useEffect(() => setPage(1), [q, role, state]);

  const list = useMemo(() => {
    const n = normalize(q.trim());
    return data.users
      .filter((u) => (!n || normalize(`${u.name} ${u.email} ${u.phone}`).includes(n)) && (!role || u.role === role) && (!state || (state === "activo" ? u.active : !u.active)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.users, q, role, state]);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const rows = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const regCount = (u: User) => data.registrations.filter((r) => r.userId === u.id).length;

  return (
    <>
      <PageTitle
        title="Utilizadores"
        description={`${data.users.length} contas · ${data.users.filter((u) => u.role !== "atleta").length} com acesso à gestão`}
        actions={
          <Button onClick={() => setEditing("novo")}>
            <UserPlus /> Criar utilizador
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={q} onChange={setQ} placeholder="Pesquisar por nome, e-mail ou telemóvel" />
        <FilterSelect value={role} onChange={setRole} label="Filtrar por perfil">
          <option value="">Todos os perfis</option>
          {(Object.keys(ROLE) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE[r].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={state} onChange={setState} label="Filtrar por estado">
          <option value="">Activos e inactivos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </FilterSelect>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Users />} title="Nenhum utilizador encontrado" />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[820px]">
            <thead className="bg-ink-50">
              <tr>
                <th className={th}>Utilizador</th>
                <th className={th}>Telemóvel</th>
                <th className={th}>Perfil</th>
                <th className={th}>Província</th>
                <th className={th}>Registo</th>
                <th className={th}>Activo</th>
                <th className={`${th} text-right`}>Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50/60">
                  <td className={td}>
                    <button onClick={() => setEditing(u)} className="flex items-center gap-3 text-left">
                      <Avatar name={u.name} className="size-9 text-xs" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900 hover:text-brand-700">
                          {u.name}
                          {u.id === me?.id && <span className="ml-1.5 text-xs font-medium text-ink-400">(você)</span>}
                        </span>
                        <span className="block text-xs text-ink-500">{u.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className={`${td} tabular whitespace-nowrap`}>{u.phone}</td>
                  <td className={td}>
                    <Badge tone={ROLE[u.role].tone}>{ROLE[u.role].label}</Badge>
                  </td>
                  <td className={td}>{u.province}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(u.createdAt)}</td>
                  <td className={td}>
                    <Toggle
                      checked={u.active}
                      label={u.active ? "Activo" : "Inactivo"}
                      onChange={() => {
                        if (u.id === me?.id) return toast({ tone: "error", title: "Não pode desactivar a sua própria conta" });
                        toggleActive("users", u.id);
                        toast({ title: u.active ? "Conta desactivada" : "Conta activada", description: u.name });
                      }}
                    />
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                        <Eye /> <span className="hidden xl:inline">Ver / editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setToDelete(u)} disabled={u.id === me?.id} aria-label={`Eliminar ${u.name}`}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onChange={setPage} total={list.length} perPage={PER_PAGE} />
        </TableWrap>
      )}

      <UserModal user={editing} onClose={() => setEditing(null)} regCount={editing && editing !== "novo" ? regCount(editing) : 0} />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar utilizador?"
        description={
          <>
            A conta de <strong>{toDelete?.name}</strong> ({toDelete?.email}) será eliminada. Considere antes desactivá-la, para manter o histórico.
          </>
        }
        onConfirm={() => {
          if (!toDelete) return;
          remove("users", toDelete.id);
          toast({ title: "Utilizador eliminado", description: toDelete.name });
        }}
      />
    </>
  );
}

function blankUser(): User {
  return {
    id: uid("u"),
    name: "",
    email: "",
    phone: "",
    role: "atleta",
    birthDate: "",
    gender: "M",
    documentType: "BI",
    documentNumber: "",
    province: "Luanda",
    city: "",
    club: "Individual",
    tshirt: "M",
    emergencyContact: { name: "", phone: "", relation: "" },
    createdAt: new Date().toISOString(),
    active: true,
  };
}

function UserModal({ user, onClose, regCount }: { user: User | "novo" | null; onClose: () => void; regCount: number }) {
  const { data, create, update } = useAdmin();
  const { user: me } = useAuth();
  const toast = useToast();
  const isNew = user === "novo";
  const [form, setForm] = useState<User>(blankUser);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setForm(user === "novo" ? blankUser() : { ...user });
    setErrors({});
  }, [user]);

  const set = (p: Partial<User>) => setForm((f) => ({ ...f, ...p }));
  const isMe = !isNew && form.id === me?.id;

  function save() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Indique o nome.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Indique um e-mail válido.";
    else if (data.users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase() && u.id !== form.id)) e.email = "Já existe uma conta com este e-mail.";
    if (form.phone.replace(/\D/g, "").length < 9) e.phone = "Indique um número de telemóvel válido.";
    setErrors(e);
    if (Object.keys(e).length) return;
    const final = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() };
    if (isNew) create("users", final);
    else update("users", form.id, final);
    toast({ title: isNew ? "Utilizador criado" : "Alterações guardadas", description: final.name });
    onClose();
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      size="lg"
      title={isNew ? "Criar utilizador" : form.name}
      description={isNew ? "A pessoa recebe um e-mail para definir a palavra-passe." : `Conta criada a ${form.createdAt ? formatDate(form.createdAt) : "—"} · ${regCount} inscrições associadas`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>{isNew ? "Criar utilizador" : "Guardar"}</Button>
        </>
      }
    >
      <form
        className="space-y-5 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="u-name" required error={errors.name} className="sm:col-span-2">
            <Input id="u-name" value={form.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} />
          </Field>
          <Field label="E-mail" htmlFor="u-email" required error={errors.email}>
            <Input id="u-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} aria-invalid={!!errors.email} />
          </Field>
          <Field label="Telemóvel" htmlFor="u-phone" required error={errors.phone}>
            <Input id="u-phone" type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+244 9XX XXX XXX" aria-invalid={!!errors.phone} />
          </Field>
          <Field label="Perfil" htmlFor="u-role" hint={isMe ? "Não pode alterar o seu próprio perfil." : "Organizadores e administradores acedem à gestão."}>
            <Select id="u-role" value={form.role} onChange={(e) => set({ role: e.target.value as UserRole })} disabled={isMe}>
              {(Object.keys(ROLE) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE[r].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado da conta">
            <div className="flex h-12 items-center">
              <Toggle checked={form.active} onChange={(active) => !isMe && set({ active })} label={form.active ? "Activa" : "Desactivada"} />
            </div>
          </Field>
        </div>

        <div className="grid gap-5 border-t border-ink-100 pt-5 sm:grid-cols-3">
          <Field label="Sexo" htmlFor="u-gender">
            <Select id="u-gender" value={form.gender} onChange={(e) => set({ gender: e.target.value as Gender })}>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </Field>
          <Field label="Data de nascimento" htmlFor="u-birth">
            <Input id="u-birth" type="date" value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
          </Field>
          <Field label="T-shirt" htmlFor="u-tshirt">
            <Select id="u-tshirt" value={form.tshirt} onChange={(e) => set({ tshirt: e.target.value as TShirtSize })}>
              {(["XS", "S", "M", "L", "XL", "XXL"] as TShirtSize[]).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Documento" htmlFor="u-doc">
            <Select id="u-doc" value={form.documentType} onChange={(e) => set({ documentType: e.target.value as User["documentType"] })}>
              <option value="BI">BI</option>
              <option value="Passaporte">Passaporte</option>
            </Select>
          </Field>
          <Field label="N.º do documento" htmlFor="u-docn" className="sm:col-span-2">
            <Input id="u-docn" value={form.documentNumber} onChange={(e) => set({ documentNumber: e.target.value })} />
          </Field>
          <Field label="Província" htmlFor="u-prov">
            <Select id="u-prov" value={form.province} onChange={(e) => set({ province: e.target.value })}>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade" htmlFor="u-city">
            <Input id="u-city" value={form.city} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="Clube" htmlFor="u-club">
            <Input id="u-club" value={form.club} onChange={(e) => set({ club: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-5 border-t border-ink-100 pt-5 sm:grid-cols-3">
          <Field label="Contacto de emergência" htmlFor="u-em-name">
            <Input id="u-em-name" value={form.emergencyContact.name} onChange={(e) => set({ emergencyContact: { ...form.emergencyContact, name: e.target.value } })} />
          </Field>
          <Field label="Telemóvel de emergência" htmlFor="u-em-phone">
            <Input id="u-em-phone" type="tel" value={form.emergencyContact.phone} onChange={(e) => set({ emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} />
          </Field>
          <Field label="Parentesco" htmlFor="u-em-rel">
            <Input id="u-em-rel" value={form.emergencyContact.relation} onChange={(e) => set({ emergencyContact: { ...form.emergencyContact, relation: e.target.value } })} />
          </Field>
        </div>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
