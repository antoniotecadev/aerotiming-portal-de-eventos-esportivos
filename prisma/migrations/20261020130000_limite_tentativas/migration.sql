-- 7.9: limite de tentativas (login, registo, recuperar palavra-passe, inscrição, contacto).
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMPTZ(3) NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");

-- Só o servidor (Prisma) usa esta tabela: RLS ligado e sem políticas = fechada à API pública do Supabase.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
