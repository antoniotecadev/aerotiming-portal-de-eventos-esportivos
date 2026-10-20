-- 5.10: pesquisa de nomes sem acentos e sem maiúsculas no servidor ("Sebastiao" encontra "Sebastião").
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- unaccent() é STABLE; esta versão IMMUTABLE pode ser usada em índices.
CREATE OR REPLACE FUNCTION public.search_norm(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  SET search_path = ''
AS $$ SELECT lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1)) $$;
