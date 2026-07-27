-- Team access, automatic Auth linking and server-side permissions.

CREATE UNIQUE INDEX IF NOT EXISTS system_users_email_unique
  ON public."systemUsers" (LOWER(email));

CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT su."userId"
      FROM public."systemUsers" su
      WHERE su."authUserId" = auth.uid()
        AND su.status = 'Ativo'
      LIMIT 1
    ),
    (
      SELECT s."userId"
      FROM public.settings s
      WHERE s."userId" = auth.uid()
      LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_privilege()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.settings s WHERE s."userId" = auth.uid()
    ) THEN 'Admin'
    ELSE (
      SELECT su.privilege
      FROM public."systemUsers" su
      WHERE su."authUserId" = auth.uid()
        AND su.status = 'Ativo'
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_access_context()
RETURNS TABLE (
  account_id UUID,
  privilege TEXT,
  status TEXT,
  is_owner BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.current_account_id(),
    public.current_privilege(),
    CASE WHEN public.current_account_id() IS NULL THEN 'Inativo' ELSE 'Ativo' END,
    EXISTS (SELECT 1 FROM public.settings s WHERE s."userId" = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.current_account_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_privilege() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_access_context() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  linked_member UUID;
BEGIN
  UPDATE public."systemUsers"
     SET "authUserId" = NEW.id
   WHERE id = (
     SELECT id
       FROM public."systemUsers"
      WHERE LOWER(email) = LOWER(NEW.email)
        AND "authUserId" IS NULL
        AND status = 'Ativo'
      LIMIT 1
   )
   RETURNING id INTO linked_member;

  IF linked_member IS NULL THEN
    INSERT INTO public.settings ("userId", email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT ("userId") DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS settings_owner_all ON public.settings;
DROP POLICY IF EXISTS contacts_owner_all ON public.contacts;
DROP POLICY IF EXISTS products_owner_all ON public.products;
DROP POLICY IF EXISTS system_users_owner_all ON public."systemUsers";
DROP POLICY IF EXISTS service_orders_owner_all ON public."serviceOrders";
DROP POLICY IF EXISTS transactions_owner_all ON public.transactions;
DROP POLICY IF EXISTS invoices_owner_all ON public.invoices;
DROP POLICY IF EXISTS notifications_owner_all ON public.notifications;

CREATE POLICY settings_team_read ON public.settings
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY settings_admin_write ON public.settings
  FOR UPDATE USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE POLICY contacts_team_read ON public.contacts
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY contacts_authorized_write ON public.contacts
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico', 'Vendedor')
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico', 'Vendedor')
  );

CREATE POLICY products_team_read ON public.products
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY products_admin_write ON public.products
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE POLICY system_users_team_read ON public."systemUsers"
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY system_users_admin_write ON public."systemUsers"
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() = 'Admin'
  );

CREATE POLICY service_orders_team_read ON public."serviceOrders"
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY service_orders_technical_write ON public."serviceOrders"
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico')
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico')
  );

CREATE POLICY transactions_team_read ON public.transactions
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY transactions_authorized_write ON public.transactions
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Vendedor')
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Vendedor')
  );

CREATE POLICY invoices_team_read ON public.invoices
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY invoices_authorized_write ON public.invoices
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Vendedor')
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Vendedor')
  );

CREATE POLICY notifications_team_read ON public.notifications
  FOR SELECT USING ("userId" = public.current_account_id());
CREATE POLICY notifications_authorized_write ON public.notifications
  FOR ALL USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() <> 'Visualizador'
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() <> 'Visualizador'
  );

CREATE OR REPLACE FUNCTION public.finalize_service_order(
  p_service_order_id UUID,
  p_status TEXT,
  p_materials TEXT,
  p_finalization_notes TEXT,
  p_used_products JSONB,
  p_signature TEXT DEFAULT NULL
)
RETURNS public."serviceOrders"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  service_order public."serviceOrders";
  product_item JSONB;
  requested_quantity INTEGER;
  available_quantity INTEGER;
BEGIN
  IF public.current_privilege() NOT IN ('Admin', 'Técnico') THEN
    RAISE EXCEPTION 'Usuário sem permissão para finalizar ordens de serviço';
  END IF;

  IF p_status NOT IN ('Finalizada', 'Orçamento Aceito', 'Orçamento Rejeitado') THEN
    RAISE EXCEPTION 'Status de finalização inválido.';
  END IF;

  SELECT * INTO service_order
  FROM public."serviceOrders"
  WHERE id = p_service_order_id
    AND "userId" = public.current_account_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;

  IF p_status IN ('Finalizada', 'Orçamento Aceito')
     AND service_order."stockDeductedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'O estoque desta ordem de serviço já foi baixado.';
  END IF;

  IF p_status IN ('Finalizada', 'Orçamento Aceito') THEN
    FOR product_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_used_products, '[]'::JSONB))
    LOOP
      requested_quantity := COALESCE((product_item->>'quantity')::INTEGER, 0);
      IF requested_quantity <= 0 THEN
        RAISE EXCEPTION 'A quantidade utilizada deve ser maior que zero.';
      END IF;

      SELECT stock_quantity INTO available_quantity
      FROM public.products
      WHERE id = (product_item->>'productId')::UUID
        AND "userId" = public.current_account_id()
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto da ordem de serviço não encontrado.';
      END IF;
      IF available_quantity < requested_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %.', product_item->>'name';
      END IF;

      UPDATE public.products
      SET stock_quantity = stock_quantity - requested_quantity
      WHERE id = (product_item->>'productId')::UUID
        AND "userId" = public.current_account_id();
    END LOOP;
  END IF;

  UPDATE public."serviceOrders"
  SET materials = p_materials,
      "finalizationNotes" = p_finalization_notes,
      "usedProducts" = COALESCE(p_used_products, '[]'::JSONB),
      signature = p_signature,
      status = p_status,
      "stockDeductedAt" = CASE
        WHEN p_status IN ('Finalizada', 'Orçamento Aceito') THEN NOW()
        ELSE NULL
      END
  WHERE id = p_service_order_id
  RETURNING * INTO service_order;

  RETURN service_order;
END;
$$;
