-- Initial development schema for Cardoso Ar CRM.
-- This migration is intended for a fresh Supabase project.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.settings (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "companyName" TEXT NOT NULL DEFAULT 'Cardoso Ar Condicionado',
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  logo TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  "cnpjCpf" TEXT,
  status TEXT NOT NULL DEFAULT 'Em Negociação',
  source TEXT,
  notes TEXT,
  location TEXT,
  avatar TEXT,
  initials TEXT,
  "portfolioValue" TEXT NOT NULL DEFAULT 'R$ 0,00',
  growth TEXT,
  "lastInteraction" TEXT,
  "lastInteractionTime" TEXT,
  "equipmentType" TEXT,
  "equipmentBrand" TEXT,
  "equipmentModel" TEXT,
  "equipmentQuantity" TEXT,
  btus TEXT,
  "lastMaintenanceDate" DATE,
  "nextMaintenanceDate" DATE,
  "installationDate" DATE,
  "birthDate" DATE,
  "financialStatus" TEXT,
  "paymentMethod" TEXT,
  "relationshipScore" INTEGER CHECK ("relationshipScore" BETWEEN 0 AND 100),
  "lastContactAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category TEXT,
  sku TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'un',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public."systemUsers" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "authUserId" UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT,
  role TEXT,
  privilege TEXT NOT NULL DEFAULT 'Técnico'
    CHECK (privilege IN ('Admin', 'Técnico', 'Vendedor', 'Visualizador')),
  status TEXT NOT NULL DEFAULT 'Ativo'
    CHECK (status IN ('Ativo', 'Inativo')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", email)
);

CREATE TABLE public."serviceOrders" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "contactId" UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  "contactName" TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  materials TEXT,
  "finalizationNotes" TEXT,
  "usedProducts" JSONB NOT NULL DEFAULT '[]'::JSONB,
  signature TEXT,
  value TEXT NOT NULL DEFAULT 'R$ 0,00',
  status TEXT NOT NULL DEFAULT 'Aberta'
    CHECK (status IN ('Aberta', 'Finalizada', 'Orçamento Aceito', 'Orçamento Rejeitado')),
  "stockDeductedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "contactId" UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Entrada', 'Saída')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'cancelled')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "contactId" UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  series TEXT,
  type TEXT NOT NULL CHECK (type IN ('Produto', 'Serviço')),
  "contactName" TEXT NOT NULL,
  "contactCnpjCpf" TEXT,
  "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  "totalAmount" NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK ("totalAmount" >= 0),
  status TEXT NOT NULL DEFAULT 'Rascunho'
    CHECK (status IN ('Emitida', 'Cancelada', 'Rascunho')),
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  observations TEXT,
  "xmlUrl" TEXT,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('lead', 'os', 'contact', 'system', 'alert')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX contacts_user_id_idx ON public.contacts ("userId");
CREATE INDEX contacts_next_maintenance_idx ON public.contacts ("userId", "nextMaintenanceDate");
CREATE INDEX products_user_id_idx ON public.products ("userId");
CREATE INDEX service_orders_user_id_idx ON public."serviceOrders" ("userId");
CREATE INDEX service_orders_contact_id_idx ON public."serviceOrders" ("contactId");
CREATE INDEX transactions_user_date_idx ON public.transactions ("userId", date);
CREATE INDEX invoices_user_id_idx ON public.invoices ("userId");
CREATE INDEX notifications_user_created_idx ON public.notifications ("userId", "createdAt" DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER contacts_set_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER system_users_set_updated_at BEFORE UPDATE ON public."systemUsers"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER service_orders_set_updated_at BEFORE UPDATE ON public."serviceOrders"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."systemUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."serviceOrders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY settings_owner_all ON public.settings
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY contacts_owner_all ON public.contacts
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY products_owner_all ON public.products
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY system_users_owner_all ON public."systemUsers"
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY service_orders_owner_all ON public."serviceOrders"
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY transactions_owner_all ON public.transactions
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY invoices_owner_all ON public.invoices
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");
CREATE POLICY notifications_owner_all ON public.notifications
  FOR ALL USING ((SELECT auth.uid()) = "userId")
  WITH CHECK ((SELECT auth.uid()) = "userId");

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.settings,
  public.contacts,
  public.products,
  public."systemUsers",
  public."serviceOrders",
  public.transactions,
  public.invoices,
  public.notifications;
