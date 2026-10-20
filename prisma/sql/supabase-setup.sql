-- ════════════════════════════════════════════════════════════════════
-- Configuração específica do Supabase (fora das migrações do Prisma)
--
-- Porque está aqui? O `prisma migrate dev` testa as migrações numa base
-- temporária que não tem o schema `auth` do Supabase. Os triggers sobre
-- auth.users falhariam lá. Triggers e RLS não interferem com o Prisma.
--
-- É IDEMPOTENTE: pode (e deve) ser executado depois de cada migração:
--   npm run db:supabase
-- ════════════════════════════════════════════════════════════════════


-- ── 1. Perfil automático quando alguém cria conta ──────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. Manter o e-mail do perfil igual ao da conta ─────────────────────
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = coalesce(new.email, ''), updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();


-- ── 3. Apagar o perfil quando a conta é apagada ────────────────────────
-- As inscrições ficam com user_id = null (histórico e resultados mantêm-se).
create or replace function public.handle_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_user_deleted();

-- Estas funções só servem para triggers: ninguém as pode chamar pela API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.handle_user_deleted() from public, anon, authenticated;


-- ── 4. RLS em TODAS as tabelas do schema public ────────────────────────
-- Sem políticas = a API pública do Supabase (chave publicável) não lê nem
-- escreve nada. O Prisma liga-se como dono das tabelas e não é afectado.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
