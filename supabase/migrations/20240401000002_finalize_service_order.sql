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
SET search_path = ''
AS $$
DECLARE
  service_order public."serviceOrders";
  product_item JSONB;
  requested_quantity INTEGER;
  available_quantity INTEGER;
BEGIN
  IF p_status NOT IN ('Finalizada', 'Orçamento Aceito', 'Orçamento Rejeitado') THEN
    RAISE EXCEPTION 'Status de finalização inválido.';
  END IF;

  SELECT *
    INTO service_order
    FROM public."serviceOrders"
   WHERE id = p_service_order_id
     AND "userId" = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada.';
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

      SELECT stock_quantity
        INTO available_quantity
        FROM public.products
       WHERE id = (product_item->>'productId')::UUID
         AND "userId" = auth.uid()
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
         AND "userId" = auth.uid();
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

REVOKE ALL ON FUNCTION public.finalize_service_order(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_service_order(UUID, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
