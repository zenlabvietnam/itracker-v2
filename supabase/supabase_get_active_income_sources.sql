CREATE OR REPLACE FUNCTION public.get_active_income_sources_for_user(p_user_id uuid)
 RETURNS SETOF public.income_sources
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    *
  FROM
    public.income_sources
  WHERE
    user_id = p_user_id AND status = 'active';
END;
$function$;
