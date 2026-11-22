# ADT — Extracteur de données AI

Cockpit React/Vite pour extraire et vérifier les tableaux TCT et Olymel.

## Exécution

Node.js 22, `npm ci`, puis `npm run dev` pour le frontend. L’API `/api/extract` requiert le runtime Vercel (ou `vercel dev`). `npm run build` et `npx tsc --noEmit` valident le frontend et les types. `node extract.test.cjs` vérifie les barrières de l’API sans appel payant.

## Configuration serveur

Dans **Paramètres → OpenRouter**, l’administrateur renseigne sa clé, choisit un modèle compatible images/JSON et enregistre ses instructions TCT et Olymel. La clé est validée auprès d’OpenRouter puis conservée chiffrée dans Supabase Vault. Les anciens paramètres Vercel OPENROUTER_API_KEY / OPENROUTER_MODEL ne sont plus utilisés. Supabase utilise une clé publiable et des politiques RLS. Aucune clé service_role n’est nécessaire dans le frontend.

La connexion utilise le dôme, le courriel et un mot de passe personnel. L’inscription demande uniquement dôme, ID employé et courriel ; Supabase envoie un lien natif pour confirmer le courriel et choisir le mot de passe. L’ID employé n’est jamais utilisé comme secret. Le bouton œil affiche/masque uniquement la valeur saisie. Le rôle administrateur ADT est attribué côté serveur dans `app_metadata.adt_role`; le champ `adt_profiles.account_role` sert à l’affichage. Aucun formulaire public ne peut promouvoir un compte.

## Base de données

Les migrations dans `supabase/migrations` créent les tables ADT isolées. Elles ont été appliquées au projet cible ; ne pas les réexécuter manuellement sur cette base. Les anciens scripts SQL à la racine sont historiques et ne constituent pas la procédure ADT actuelle. `rls-check.sql` teste les droits avec des données synthétiques, dans une transaction annulée.

Les données personnelles des documents ne sont pas enregistrées dans Git. Les lignes sont vérifiées puis sauvegardées explicitement par l’utilisateur ; l’administrateur peut les consulter dans l’onglet Administration. Les sources image ne sont pas conservées en base. Formats d’extraction : JPEG, PNG, WebP, maximum 3 Mo ; PDF non pris en charge.

Voir LIVRAISON.md pour les preuves et limites restantes.

## Envoi des activations

URL Supabase : https://adt-extracteur-ai.vercel.app/ ; redirection exacte : https://adt-extracteur-ai.vercel.app/?setup=1. L’application utilise `signInWithOtp` avec le vrai courriel et `resetPasswordForEmail` pour la récupération. Le lien doit être ouvert par le destinataire. Les secrets ne sont ni déchiffrés, ni stockés dans les profils.

Le SMTP personnalisé doit être configuré dans Supabase pour l’envoi aux membres externes. Sans cela, le service de courriel intégré impose ses restrictions de destinataires et de débit. Tests : `node auth.test.cjs` et `node extract.test.cjs`. Les inscriptions et la réception réelle doivent être qualifiées avec le fournisseur SMTP choisi.

## Paramètres IA administrateur

Le bouton Paramètres est accessible dans la navigation. L’URL `/?section=settings` ouvre cet écran après connexion. Le rôle ADT est vérifié à partir du compte Supabase actuel, et de nouveau côté serveur pour chaque opération. Un membre peut extraire ses documents mais ne peut ni lire ni modifier la configuration.

- Clé API : saisie masquée, jamais renvoyée après sauvegarde, jamais stockée dans localStorage ou Git.
- Catalogue : modèles OpenRouter déclarant une entrée image, une sortie texte et un paramètre JSON.
- Skill : texte ou fichier .md/.txt, maximum 20 000 caractères, par type de document. Les instructions complètent le contrat du tableau ; aucun code de skill n’est exécuté.
- Vérification : contrôle de validité de la clé et de disponibilité du modèle, sans inférence payante. Une extraction réelle reste nécessaire pour qualifier la qualité du modèle.
- Limites : 5 extractions/minute et 100/jour par utilisateur ; elles ne remplacent pas un plafond de dépenses configuré chez OpenRouter.

`supabase/functions/adt-ai` contient l’API authentifiée. Les RPC de lecture/écriture de Vault sont réservés au rôle serveur `service_role`. Le frontend ne dispose d’aucun accès direct aux tables privées. RLS sans politique sur ces tables est intentionnel : refus de tout accès client. La fonction vérifie le JWT auprès de Supabase Auth elle-même (`verify_jwt=false` à la passerelle, aucune requête métier anonyme admise).

Tests : `node ai-settings.test.cjs` (18 contrôles), `node extract.test.cjs` (proxy) et `node auth.test.cjs`. Le contrôle SQL en transaction annulée a validé Vault, le remplacement de clé, les permissions et le quota.
