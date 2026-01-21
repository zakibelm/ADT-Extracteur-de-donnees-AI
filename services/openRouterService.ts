
import { DocumentType } from '../types';

export const extractDataWithOpenRouter = async (
  base64Image: string, 
  docType: DocumentType
) => {
  const apiKey = localStorage.getItem('adt_openrouter_key');
  const model = localStorage.getItem('adt_model') || 'anthropic/claude-3.5-sonnet';
  const customPromptTCT = localStorage.getItem('adt_prompt_tct');
  const customPromptOlymel = localStorage.getItem('adt_prompt_olymel');

  if (!apiKey) throw new Error("Clé API OpenRouter manquante. Veuillez la configurer dans les paramètres.");

  const schemaTCT = `tournee, nom, debTour, finTour, clVeh, employe, nomEmploye, employeConfirm, vehicule, changement, changementPar, clVehAff, autoris, approuve, retour, adresseDebut, adresseFin`;
  const schemaOlymel = `semaine, jour, date, debut, fin, duree, chauffeur, vehicule, notes`;

  const currentSchemaFields = docType === DocumentType.TCT ? schemaTCT : schemaOlymel;
  
  const defaultPrompt = `Tu es un expert OCR spécialisé dans les documents de transport.
Analyse l'image et extrais les données du tableau.

### STRUCTURE JSON ATTENDUE
Retourne UNIQUEMENT un objet JSON comme ceci : {"rows": [{"champ1": "valeur", ...}]}.

### CHAMPS À UTILISER
${currentSchemaFields}

### RÈGLES
1. Pas de texte avant ou après le JSON.
2. Si une cellule est illisible ou vide, utilise "".
3. Extrais absolument toutes les lignes visibles.`;

  const systemInstruction = docType === DocumentType.TCT 
    ? (customPromptTCT || defaultPrompt) 
    : (customPromptOlymel || defaultPrompt);

  try {
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "model": model,
        "messages": [
          { "role": "system", "content": systemInstruction },
          {
            "role": "user",
            "content": [
              { "type": "text", "text": "Extrais les données de ce tableau en JSON." },
              { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${cleanBase64}` } }
            ]
          }
        ],
        "temperature": 0.1,
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Erreur API.");
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Tentative de parsing flexible
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Si le JSON est mal formé, on essaie d'extraire ce qui ressemble à un objet
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Format de réponse invalide.");
      }
    }

    let rawRows = parsed.rows || parsed.data || (Array.isArray(parsed) ? parsed : []);
    
    if (!Array.isArray(rawRows) && typeof parsed === 'object') {
      // Si l'IA a mis les lignes dans une autre clé
      const firstArrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (firstArrayKey) rawRows = parsed[firstArrayKey];
    }

    // Normalisation
    return rawRows.map((row: any) => {
      const normalized: any = {};
      currentSchemaFields.split(', ').forEach(field => {
        // Cherche une correspondance insensible à la casse
        const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === field.toLowerCase().replace(/[^a-z]/g, ''));
        normalized[field] = foundKey ? String(row[foundKey]) : "";
      });
      return normalized;
    }).filter((row: any) => Object.values(row).some(v => v !== ""));

  } catch (err: any) {
    console.error("Extraction Error:", err);
    throw new Error(err.message || "Erreur lors de l'analyse.");
  }
};
