-- Location helpers for map pin picker

CREATE OR REPLACE FUNCTION public.get_locations_geo()
RETURNS TABLE (
  id UUID,
  name TEXT,
  area_label TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.name,
    l.area_label,
    ST_Y(l.point::geometry) AS lat,
    ST_X(l.point::geometry) AS lng
  FROM locations l
  WHERE l.is_public_place = true
  ORDER BY l.name;
$$;

CREATE OR REPLACE FUNCTION public.create_location_from_pin(
  p_name TEXT,
  p_area_label TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_name TEXT;
  v_area TEXT;
BEGIN
  v_name := left(trim(COALESCE(p_name, '')), 120);
  v_area := left(trim(COALESCE(p_area_label, '')), 120);

  IF v_name = '' THEN
    RAISE EXCEPTION 'Place name is required';
  END IF;
  IF v_area = '' THEN
    RAISE EXCEPTION 'Area label is required';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Invalid map coordinates';
  END IF;

  INSERT INTO locations (name, area_label, point, is_public_place)
  VALUES (
    v_name,
    v_area,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    true
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locations_geo() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_location_from_pin(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
