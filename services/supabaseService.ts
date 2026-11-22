import { createClient } from '@supabase/supabase-js';
import { DocumentType, ExtractionRow } from '../types';
import { TCT_COLUMNS, OLYMEL_COLUMNS } from '../constants';

export const supabase = createClient('https://csypcxkpipafxrjaborn.supabase.co', 'sb_publishable_C5bc98EYLigfq9_UsXWzBw_qk5QNyfi');
export const isAdtAdmin = (user: any) => user?.app_metadata?.adt_role === 'admin';

export async function saveExtractionToSupabase(rows: ExtractionRow[], docType: DocumentType, requestId = crypto.randomUUID()) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Connectez-vous pour sauvegarder.');
  const columns = docType === DocumentType.TCT ? TCT_COLUMNS : OLYMEL_COLUMNS;
  const records = rows.map((row, index) => {
    const data = Object.fromEntries(columns.map(({key}) => [key, String((row as any)[key] ?? '')]));
    const raw = data.horaire || '';
    const date = /^\d{8}$/.test(raw) ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}` : null;
    return { user_id: user.id, request_id: requestId, row_index: index, doc_type: docType,
      source_file: String((row as any).source_file || ''), schedule_date: date, data };
  });
  const { data, error } = await supabase.from('adt_extractions').upsert(records, {
    onConflict: 'user_id,request_id,row_index', ignoreDuplicates: true,
  }).select();
  if (error) throw new Error(`Sauvegarde refusée : ${error.message}`);
  return data;
}

export async function loadAdminPage(tab: 'users' | 'data', page = 0) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdtAdmin(user)) throw new Error('Accès administrateur requis.');
  const { data, error, count } = await supabase.from(tab === 'users' ? 'adt_profiles' : 'adt_extractions')
    .select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
  if (error) throw new Error(error.message);
  return { rows: data || [], count: count || 0 };
}

export const activationRedirect = () => `${window.location.origin}/?setup=1`;
export async function requestMemberActivation(dome: string, employeeId: string, email: string) {
  const cleanDome = dome.trim();
  const cleanId = employeeId.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!/^\d{1,12}$/.test(cleanDome) || !/^\d{1,12}$/.test(cleanId)) throw new Error('Dôme et ID employé : 1 à 12 chiffres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Adresse courriel invalide.');
  const { error } = await supabase.auth.signInWithOtp({email: cleanEmail, options: {
    emailRedirectTo: activationRedirect(), shouldCreateUser: true,
    data: {adt_app: 'extracteur', dome: cleanDome, employee_id: cleanId, numDome: cleanDome, employeeId: cleanId},
  }});
  if (error) throw new Error(error.status === 429 ? 'Trop de demandes. Attendez quelques minutes avant de réessayer.' : 'Envoi impossible. Le dôme peut être déjà utilisé, ou le service courriel indisponible.');
}
export async function requestMemberRecovery(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {redirectTo: activationRedirect()});
  if (error) throw new Error(error.status === 429 ? 'Attendez quelques minutes avant de demander un autre lien.' : 'Impossible d’envoyer le lien pour le moment.');
}
export async function signInMember(dome: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({email: email.trim().toLowerCase(), password});
  if (error || !data.user) throw new Error('Courriel ou mot de passe incorrect, ou compte non activé.');
  const { data: profile, error: profileError } = await supabase.from('adt_profiles').select('dome').eq('id', data.user.id).single();
  if (profileError || profile?.dome !== dome.trim()) {
    await supabase.auth.signOut();
    throw new Error('Le dôme ne correspond pas au compte connecté.');
  }
}
