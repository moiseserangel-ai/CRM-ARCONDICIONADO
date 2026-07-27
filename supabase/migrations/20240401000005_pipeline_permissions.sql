-- Align Pipeline actions with Admin, Technician, Sales and Viewer roles.

DROP POLICY IF EXISTS service_orders_technical_write ON public."serviceOrders";

CREATE POLICY service_orders_authorized_insert ON public."serviceOrders"
  FOR INSERT WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico', 'Vendedor')
  );

CREATE POLICY service_orders_technical_update ON public."serviceOrders"
  FOR UPDATE USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico')
  )
  WITH CHECK (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico')
  );

CREATE POLICY service_orders_technical_delete ON public."serviceOrders"
  FOR DELETE USING (
    "userId" = public.current_account_id()
    AND public.current_privilege() IN ('Admin', 'Técnico')
  );
