-- 12.4 (B6): a API pública do Supabase (chave publicável no browser) não pode ler nem escrever nada no
-- schema public. A aplicação acede só pelo Prisma, como dono das tabelas (não é afectada pelo RLS).
-- Antes, isto só ficava activo depois de "npm run db:supabase"; agora vem com as migrações.

-- RLS ligado em todas as tabelas (sem políticas = fechado)
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Sem privilégios para os papéis da API, também nas tabelas criadas no futuro (só existem no Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
