CREATE TABLE public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdBy" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  "fileName" TEXT NOT NULL,
  "recordCounts" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX backup_history_account_created_idx
  ON public.backup_history ("accountId", "createdAt" DESC);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY backup_history_admin_read ON public.backup_history
  FOR SELECT USING (
    "accountId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE POLICY backup_history_admin_insert ON public.backup_history
  FOR INSERT WITH CHECK (
    "accountId" = public.current_account_id()
    AND "createdBy" = auth.uid()
    AND public.current_privilege() = 'Admin'
  );
