
import { GoogleGenAI } from "@google/genai";
import { DocumentType } from '../types';

export const extractDataWithGemini = async (
  base64Image: string, 
  docType: DocumentType
) => {
  // Always use {apiKey: process.env.API_KEY} as a named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.apiKey || process.env.API_KEY });
  
  const schemaTCT = `tournee, nom, debTour, finTour, clVeh, employe, nomEmploye, employeConfirm, vehicule, changement, changementPar, clVehAff, autoris, approuve, retour, adresseDebut, adresseFin`;
  const schemaOlymel = `semaine, jour, date, debut, fin, duree, chauffeur, vehicule, notes`;

  const currentSchemaFields = docType === DocumentType.TCT ? schemaTCT : schemaOlymel;
  
  // Prompt renforcé pour l'exhaustivité
  const systemInstruction = `Tu es un expert en extraction de données tabulaires critiques. 
Ta mission est d'extraire TOUTES les lignes du tableau présent dans l'image sans exception.

### RÈGLES DE CONFORMITÉ :
1. EXHAUSTIVITÉ : Ne saute aucune ligne. Même si une donnée est partiellement illisible, note ce que tu vois.
2. FIDÉLITÉ : Ne reformate pas les noms ou les dates. Copie exactement ce qui est écrit.
3. STRUCTURE : Retourne un objet JSON strict avec une clé "rows" contenant un tableau d'objets.
4. CHAMPS OBLIGATOIRES : Chaque objet doit avoir exactement ces clés : [${currentSchemaFields}].

### FORMAT DE SORTIE :
{"rows": [ {"${currentSchemaFields.split(', ')[0]}": "valeur", ...} ]}

Si une cellule est vide, utilise "". Si une ligne est une ligne de total ou de séparation, ignore-la. Concentre-toi sur les données de transport.`;

  const cleanBase64 = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  try {
    // Use ai.models.generateContent directly with model name and parameters
    const response = await ai.models.generateContent({
      // Use 'gemini-3-pro-preview' for complex text/extraction tasks as per guidelines
      model: 'gemini-3-pro-preview', 
      contents: [
        {
          parts: [
            { text: `Analyse ce document ${docType} et extrais chaque ligne du tableau avec précision. Vérifie deux fois que le nombre de lignes extraites correspond au nombre de lignes visibles.` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        temperature: 0,
      }
    });

    // Use response.text property (not a method)
    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA.");

    const parsed = JSON.parse(text);
    let rawRows = parsed.rows || parsed.data || (Array.isArray(parsed) ? parsed : []);

    // Normalisation rigoureuse
    return rawRows.map((row: any) => {
      const normalized: any = {};
      currentSchemaFields.split(', ').forEach(field => {
        // Recherche intelligente de clé (insensible casse/espace/accents)
        const foundKey = Object.keys(row).find(k => 
          k.toLowerCase().trim().replace(/[^a-z]/g, '') === field.toLowerCase().replace(/[^a-z]/g, '')
        );
        normalized[field] = foundKey ? String(row[foundKey]).trim() : "";
      });
      return normalized;
    }).filter((row: any) => {
      // On garde la ligne si au moins 2 colonnes sont remplies (évite les lignes fantômes)
      const values = Object.values(row).filter(v => v !== "");
      return values.length >= 2;
    });

  } catch (err: any) {
    console.error("Gemini Error:", err);
    throw new Error("Erreur d'extraction : Le document est peut-être trop flou ou le format est inconnu.");
  }
};
