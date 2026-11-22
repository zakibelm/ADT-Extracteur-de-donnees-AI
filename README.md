# ADT — Extracteur de données AI

Cockpit React/Vite pour extraire et vérifier les tableaux TCT et Olymel.

## Exécution

Node.js 22, `npm ci`, puis `npm run dev` pour le frontend. L’API `/api/extract` requiert le runtime Vercel (ou `vercel dev`). `npm run build` et `npx tsc --noEmit` valident le frontend et les types. `node extract.test.cjs` vérifie les barrières de l’API sans appel payant.

## Configuration serveur

Sur Vercel, définir `OPENROUTER_API_KEY` et `OPENROUTER_MODEL` (modèle acceptant images et sortie JSON). Aucun préfixe VITE_ : les secrets restent dans l’API serveur. Supabase utilise une clé publiable et des politiques RLS. Aucune clé service_role n’est nécessaire dans le frontend.

La connexion utilise le dôme, le courriel et un mot de passe personnel. L’inscription demande uniquement dôme, ID employé et courriel ; Supabase envoie un lien natif pour confirmer le courriel et choisir le mot de passe. L’ID employé n’est jamais utilisé comme secret. Le bouton œil affiche/masque uniquement la valeur saisie. Le rôle administrateur ADT est attribué côté serveur dans `app_metadata.adt_role`; le champ `adt_profiles.account_role` sert à l’affichage. Aucun formulaire public ne peut promouvoir un compte.

## Base de données

Les migrations dans `supabase/migrations` créent les tables ADT isolées. Elles ont été appliquées au projet cible ; ne pas les réexécuter manuellement sur cette base. Les anciens scripts SQL à la racine sont historiques et ne constituent pas la procédure ADT actuelle. `rls-check.sql` teste les droits avec des données synthétiques, dans une transaction annulée.

Les données personnelles des documents ne sont pas enregistrées dans Git. Les lignes sont vérifiées puis sauvegardées explicitement par l’utilisateur ; l’administrateur peut les consulter dans l’onglet Administration. Les sources image ne sont pas conservées en base. Formats d’extraction : JPEG, PNG, WebP, maximum 3 Mo ; PDF non pris en charge.

Voir LIVRAISON.md pour les preuves et limites restantes.

## Envoi des activations

URL Supabase : https://adt-extracteur-ai.vercel.app/ ; redirection exacte : https://adt-extracteur-ai.vercel.app/?setup=1. L’application utilise `signInWithOtp` avec le vrai courriel et `resetPasswordForEmail` pour la récupération. Le lien doit être ouvert par le destinataire. Les secrets ne sont ni déchiffrés, ni stockés dans les profils.

Le SMTP personnalisé doit être configuré dans Supabase pour l’envoi aux membres externes. Sans cela, le service de courriel intégré impose ses restrictions de destinataires et de débit. Tests : `node auth.test.cjs` et `node extract.test.cjs`. Les inscriptions et la réception réelle doivent être qualifiées avec le fournisseur SMTP choisi.
