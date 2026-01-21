
-- Copie les utilisateurs existants qui n'ont pas encore de profil
INSERT INTO public.profiles (id, full_name, real_email, phone, dome, employee_id)
SELECT 
    id, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'real_email', 
    raw_user_meta_data->>'phone', 
    raw_user_meta_data->>'dome', 
    raw_user_meta_data->>'employee_id'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Message de confirmation pour le SQL Editor
DO $$ 
BEGIN 
  RAISE NOTICE 'Synchronisation terminée.'; 
END $$;
