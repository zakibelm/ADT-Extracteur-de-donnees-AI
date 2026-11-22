// Nom conservé pour compatibilité avec App ; l’extraction utilise OpenRouter côté serveur.
import { DocumentType } from '../types';
import { supabase } from './supabaseService';

export async function extractDataWithGemini(image: string, docType: DocumentType) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Connectez-vous pour extraire un document.');
  const response = await fetch('/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ image, docType }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Extraction indisponible.');
  if (!Array.isArray(result.rows)) throw new Error('Réponse d’extraction invalide.');
  return result.rows;
}
