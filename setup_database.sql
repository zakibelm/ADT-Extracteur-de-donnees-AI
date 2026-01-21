
-- ==========================================
-- SCRIPT DE CONFIGURATION GLOBALE ADT (CORRIGÉ)
-- ==========================================

-- 1. Table des PROFILS (Utilisateurs)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    real_email TEXT,
    phone TEXT,
    dome TEXT,
    employee_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table pour les extractions TCT (Logistique)
CREATE TABLE IF NOT EXISTS public.extractions_tct (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournee TEXT,
    nom TEXT,
    debtour TEXT,
    fintour TEXT,
    clveh TEXT,
    employe TEXT,
    nomemploye TEXT,
    employeconfirm TEXT,
    vehicule TEXT,
    changement TEXT,
    changementpar TEXT,
    clvehaff TEXT,
    autoris TEXT,
    approuve TEXT,
    retour TEXT,
    adressedebut TEXT,
    adressefin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- 3. Table pour les extractions Olymel (Transport)
CREATE TABLE IF NOT EXISTS public.extractions_olymel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    semaine TEXT,
    jour TEXT,
    date TEXT,
    debut TEXT,
    fin TEXT,
    duree TEXT,
    chauffeur TEXT,
    vehicule TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- 4. Activation de la Sécurité (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions_tct ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions_olymel ENABLE ROW LEVEL SECURITY;

-- 5. Nettoyage et Création des Politiques pour les Profils
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6. Nettoyage et Création des Politiques pour les Extractions TCT
DROP POLICY IF EXISTS "Insertion autorisée pour les connectés (TCT)" ON public.extractions_tct;
CREATE POLICY "Insertion autorisée pour les connectés (TCT)" 
ON public.extractions_tct FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Lecture de ses propres données (TCT)" ON public.extractions_tct;
CREATE POLICY "Lecture de ses propres données (TCT)" 
ON public.extractions_tct FOR SELECT USING (auth.uid() = user_id);

-- 7. Nettoyage et Création des Politiques pour les Extractions Olymel
DROP POLICY IF EXISTS "Insertion autorisée pour les connectés (Olymel)" ON public.extractions_olymel;
CREATE POLICY "Insertion autorisée pour les connectés (Olymel)" 
ON public.extractions_olymel FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Lecture de ses propres données (Olymel)" ON public.extractions_olymel;
CREATE POLICY "Lecture de ses propres données (Olymel)" 
ON public.extractions_olymel FOR SELECT USING (auth.uid() = user_id);

-- 8. TRIGGER pour créer le profil automatiquement lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, real_email, phone, dome, employee_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'real_email', 
    new.raw_user_meta_data->>'phone', 
    new.raw_user_meta_data->>'dome', 
    new.raw_user_meta_data->>'employee_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suppression et recréation du trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Permissions finales
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.extractions_tct TO authenticated;
GRANT ALL ON public.extractions_olymel TO authenticated;
