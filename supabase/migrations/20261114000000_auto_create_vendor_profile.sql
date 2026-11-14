-- Trigger function to automatically create a vendor profile upon auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 1;
BEGIN
  -- Build a URL-friendly slug from email or user id
  base_slug := lower(regexp_replace(split_part(coalesce(new.email, 'vendor'), '@', 1), '[^a-z0-9]', '', 'g'));
  IF base_slug IS NULL OR length(base_slug) < 3 THEN
    base_slug := 'shop-' || substr(new.id::text, 1, 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE store_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter::text;
    counter := counter + 1;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    store_slug,
    store_name,
    bio,
    avatar_url,
    whatsapp_phone,
    instagram_handle,
    bank_name,
    bank_account,
    bank_account_name,
    delivery_zones,
    store_active,
    plan,
    order_credits
  ) VALUES (
    new.id,
    final_slug,
    coalesce(initcap(split_part(new.email, '@', 1)), 'My Boutique'),
    'Curated pieces available to order directly on WhatsApp.',
    '',
    '',
    '',
    'Access Bank',
    '',
    '',
    jsonb_build_object(
      'Lagos Mainland', jsonb_build_object('fee', 2500),
      'Lagos Island', jsonb_build_object('fee', 3500),
      'Outside Lagos', jsonb_build_object('fee', 6000)
    ),
    true,
    'free',
    0
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_vendor ON auth.users;
CREATE TRIGGER on_auth_user_created_vendor
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_vendor();
