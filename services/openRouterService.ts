
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
  
  const defaultPrompt = `Tu es un expert OCR spécialisé dans les documents de transport Taxi Coop Terrebonne.
Analyse l'image ligne par ligne, de haut en bas.

### OBJECTIF
Extraire TOUTES les lignes de données du tableau. Ignore les en-têtes du document, concentre-toi sur le contenu du tableau.

### STRUCTURE JSON
Retourne un JSON avec cette structure exacte : {"rows": [...]}.
Chaque ligne doit utiliser ces clés : ${currentSchemaFields}

### INSTRUCTIONS CRITIQUES
1. **ZÉRO TEXTE** : Ne réponds que par le JSON. Pas de "Voici les données", etc.
2. **FIDÉLITÉ** : Si une colonne comme 'Nom de l'employé' contient un nom, il DOIT aller dans 'nomEmploye'.
3. **COMPLÉTION** : Ne saute aucune ligne du tableau. Si tu vois 10 lignes, extrais 10 objets.
4. **VALEURS** : Utilise "" pour les cellules vides. Ne mets jamais "null" ou "undefined".`;

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
        "HTTP-Referer": window.location.origin,
        "X-Title": "ADT Extracteur"
      },
      body: JSON.stringify({
        "model": model,
        "messages": [
          { "role": "system", "content": systemInstruction },
          {
            "role": "user",
            "content": [
              { "type": "text", "text": "Extrais scrupuleusement chaque ligne de ce tableau dans le format JSON demandé." },
              { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${cleanBase64}` } }
            ]
          }
        ],
        "temperature": 0, // Réduit pour plus de stabilité
        "max_tokens": 4000,
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Erreur API.");
    }

    const data = await response.json();
    let rawContent = data.choices[0].message.content.trim();
    
    // Nettoyage robuste du JSON
    const match = rawContent.match(/\{[\s\S]*\}/);
    let jsonString = match ? match[0] : rawContent;

    try {
      const parsed = JSON.parse(jsonString);
      let rawRows: any[] = [];
      
      if (parsed.rows && Array.isArray(parsed.rows)) {
        rawRows = parsed.rows;
      } else if (Array.isArray(parsed)) {
        rawRows = parsed;
      } else {
        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        rawRows = arrayKey ? parsed[arrayKey] : [parsed];
      }

      const normalizeRow = (row: any) => {
        const normalized: any = {};
        
        // Dictionnaire de mapping intelligent
        const fieldMapping: Record<string, string[]> = {
          'tournee': ['tournee', 'tournée', 'code', 'tct', 'no tournee'],
          'nom': ['nom', 'compagnie', 'name', 'client'],
          'debTour': ['debtour', 'deb tour', 'déb tour', 'début tour', 'start'],
          'finTour': ['fintour', 'fin tour', 'fin_tour', 'end'],
          'clVeh': ['clveh', 'cl véh', 'classe', 'veh type'],
          'employe': ['employe', 'id', 'no employe', 'employé'],
          'nomEmploye': ['nomemploye', 'nom de l\'employé', 'nom employé', 'employee name'],
          'employeConfirm': ['employeconfirm', 'employé (confirm)', 'confirm', 'confirmation'],
          'vehicule': ['vehicule', 'véhicule', 'no véhicule', 'car', 'unit'],
          'changement': ['changement', 'change'],
          'changementPar': ['changementpar', 'changement par', 'by'],
          'clVehAff': ['clvehaff', 'cl véh aff', 'classe aff', 'assigned class'],
          'autoris': ['autoris', 'autorisation', 'auth'],
          'approuve': ['approuve', 'approuvé', 'approved'],
          'retour': ['retour', 'return'],
          'adresseDebut': ['adressedebut', 'adresse de début', 'start address', 'origine'],
          'adresseFin': ['adressefin', 'adresse de fin', 'end address', 'destination'],
          // Olymel
          'semaine': ['semaine', 'week'],
          'jour': ['jour', 'day'],
          'date': ['date'],
          'debut': ['debut', 'début', 'start'],
          'fin': ['fin', 'end'],
          'duree': ['duree', 'durée', 'hours'],
          'chauffeur': ['chauffeur', 'driver'],
          'notes': ['notes', 'remarques']
        };

        const clean = (s: string) => s.toLowerCase().trim()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
          .replace(/[^a-z0-s]/g, ''); // Garde que les lettres a-z

        // On parcourt les clés de l'objet généré par l'IA
        Object.keys(row).forEach(aiKey => {
          const aiKeyClean = clean(aiKey);
          let found = false;

          for (const [targetKey, variations] of Object.entries(fieldMapping)) {
            if (variations.some(v => clean(v) === aiKeyClean)) {
              normalized[targetKey] = row[aiKey];
              found = true;
              break;
            }
          }
          // Si on n'a pas trouvé de mapping, on garde la clé telle quelle si elle match une clé cible
          if (!found) {
            const schemaKeys = currentSchemaFields.split(', ');
            if (schemaKeys.includes(aiKey)) normalized[aiKey] = row[aiKey];
          }
        });

        // Complétion des champs manquants
        currentSchemaFields.split(', ').forEach(field => {
          if (!normalized[field]) normalized[field] = "";
        });

        return normalized;
      };

      // Filtrer les lignes totalement vides qui pourraient être du bruit
      return rawRows
        .map(normalizeRow)
        .filter(row => {
          const values = Object.values(row).filter(v => v !== "");
          return values.length > 2; // Une ligne doit avoir au moins 3 colonnes remplies
        });

    } catch (parseErr) {
      throw new Error("Erreur critique de parsing. Le document est peut-être trop complexe.");
    }
  } catch (err: any) {
    throw new Error(err.message || "Erreur d'extraction.");
  }
};
