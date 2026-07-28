-- Fiscal configuration for NFS-e integration.
-- Sensitive credentials and certificate contents must remain in backend secrets.

CREATE TABLE IF NOT EXISTS public.fiscal_settings (
  "accountId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "companyCnpj" TEXT,
  "municipalRegistration" TEXT,
  municipality TEXT NOT NULL DEFAULT 'Presidente Médici',
  state TEXT NOT NULL DEFAULT 'RO',
  "taxRegime" TEXT NOT NULL DEFAULT 'ME'
    CHECK ("taxRegime" IN ('MEI', 'ME', 'EPP', 'Outro')),
  "simpleNational" BOOLEAN NOT NULL DEFAULT TRUE,
  "emissionMode" TEXT NOT NULL DEFAULT 'manual'
    CHECK ("emissionMode" IN ('manual', 'national', 'provider')),
  provider TEXT,
  environment TEXT NOT NULL DEFAULT 'homologation'
    CHECK (environment IN ('homologation', 'production')),
  "hasA1Certificate" BOOLEAN NOT NULL DEFAULT FALSE,
  "certificateExpiresAt" DATE,
  "portalAccessVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "serviceCode" TEXT,
  "issRate" NUMERIC(5,2) CHECK ("issRate" IS NULL OR ("issRate" >= 0 AND "issRate" <= 100)),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ready', 'connected')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS fiscal_settings_set_updated_at ON public.fiscal_settings;
CREATE TRIGGER fiscal_settings_set_updated_at
  BEFORE UPDATE ON public.fiscal_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fiscal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_settings_admin_read ON public.fiscal_settings;
DROP POLICY IF EXISTS fiscal_settings_admin_write ON public.fiscal_settings;

CREATE POLICY fiscal_settings_admin_read ON public.fiscal_settings
  FOR SELECT USING (
    "accountId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE POLICY fiscal_settings_admin_write ON public.fiscal_settings
  FOR ALL USING (
    "accountId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  )
  WITH CHECK (
    "accountId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_settings TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fiscal_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_settings;
  END IF;
END
$$;
