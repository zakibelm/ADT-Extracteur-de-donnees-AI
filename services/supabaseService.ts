
import { createClient } from '@supabase/supabase-js';
import { DocumentType, ExtractionRow } from '../types';

const SUPABASE_URL = 'https://pbxgnwbdzgmgtikdblie.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Q6XxtaFV_yYlIjmNOmRbvg_IDDQyDjA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const saveExtractionToSupabase = async (rows: ExtractionRow[], docType: DocumentType) => {
  const table = docType === DocumentType.TCT ? 'extractions_tct' : 'extractions_olymel';
  
  // Récupérer l'ID utilisateur actuel
  const { data: { user } } = await supabase.auth.getUser();

  // On prépare les données en mettant les clés en minuscules pour matcher le schéma SQL
  const dataToInsert = rows.map(({ id, ...rest }) => {
    const normalizedRow: any = {
      user_id: user?.id,
      created_at: new Date().toISOString()
    };
    
    // Convertir chaque clé en minuscule (ex: debTour -> debtour)
    Object.entries(rest).forEach(([key, value]) => {
      normalizedRow[key.toLowerCase()] = value;
    });
    
    return normalizedRow;
  });

  const { data, error } = await supabase
    .from(table)
    .insert(dataToInsert)
    .select();

  if (error) {
    console.error('Erreur Supabase:', error);
    throw new Error(`Erreur lors de la sauvegarde sur Supabase: ${error.message}`);
  }

  return data;
};
