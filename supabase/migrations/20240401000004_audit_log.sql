-- Immutable activity history for administrative accountability.

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "actorId" UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  "recordId" TEXT,
  changes JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_log_account_created_idx
  ON public.audit_log ("accountId", "createdAt" DESC);
CREATE INDEX audit_log_actor_idx ON public.audit_log ("actorId");

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_admin_read ON public.audit_log
  FOR SELECT USING (
    "accountId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE OR REPLACE FUNCTION public.record_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  row_data JSONB;
  account_id UUID;
  record_id TEXT;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  account_id := COALESCE((row_data->>'userId')::UUID, public.current_account_id());
  record_id := row_data->>'id';

  row_data := row_data - ARRAY[
    'logo', 'signature', 'avatar', 'token', 'password'
  ];

  INSERT INTO public.audit_log (
    "accountId", "actorId", entity, action, "recordId", changes
  )
  VALUES (
    account_id,
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    record_id,
    row_data
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();
CREATE TRIGGER audit_service_orders
  AFTER INSERT OR UPDATE OR DELETE ON public."serviceOrders"
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();
CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();
CREATE TRIGGER audit_system_users
  AFTER INSERT OR UPDATE OR DELETE ON public."systemUsers"
  FOR EACH ROW EXECUTE FUNCTION public.record_audit_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
