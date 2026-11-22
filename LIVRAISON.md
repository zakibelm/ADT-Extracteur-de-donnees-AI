# ADT — Refonte cockpit pétrole

## Périmètre

Présentation de l’accueil, de la connexion, de l’import, des résultats et des paramètres. Navigation responsive et suppression des sous-menus sans action et de l’historique non implémenté. Les services d’authentification, d’extraction et de sauvegarde ne sont pas modifiés.

## Changements

- CSS local embarqué dans le build ; retrait du script Tailwind distant et de la police Google distante.
- Palette claire et pétrole, actions hiérarchisées, liste de fichiers lisible et états textuels.
- Tableau conservant toutes les colonnes, édition par ligne, export CSV et sauvegarde existants.
- Labels de formulaire, noms accessibles des boutons, focus visible, lien d’évitement et mouvement réduit.
- Changement de format réinitialisant le contexte des documents et résultats ; navigation désactivée pendant l’extraction pour éviter de présenter une extraction dans le mauvais contexte.
- La progression simulée existante reste dans le pipeline mais aucun faux pourcentage n’est affiché.

## Vérification

- `npm run build` : réussi, Vite 6.4.6 ; avertissement existant de bundle JavaScript supérieur à 500 Ko.
- `npx tsc --noEmit` : réussi après l’ajustement explicite du type de la liste File.
- Revue visuelle et parcours interactifs complets : non exécutés ; le démarrage de Chromium est bloqué par l’environnement. Aucun résultat visuel ni score automatisé n’est revendiqué.
- Aucun appel réel aux fournisseurs IA, aucune authentification réelle ni écriture Supabase effectuée pour qualifier cette présentation.

## Points restants

Les résultats Lighthouse, axe-core et les observations sur appareils ne sont pas mesurés dans cette livraison. Les défauts préexistants de la logique d’extraction (progression simulée, gestion des résultats partiels) et de l’export CSV ne sont pas corrigés dans cette refonte de design. La qualité et la précision de l’extraction ne sont pas évaluées.

Système de design : voir `DESIGN.md`.


## Intégration Supabase ADT
- Projet : csypcxkpipafxrjaborn (Canada), tables isolées adt_profiles et adt_extractions.
- Authentification : dôme + mot de passe distinct de l’ID employé. Les inscriptions demandent une activation administrateur.
- Administration : consultation paginée des utilisateurs et des lignes sauvegardées. Le rôle est validé depuis app_metadata.adt_role, jamais user_metadata.
- Modèle TCT : date du document, deux colonnes employé distinctes, statut FDR, cases cochées et provenance. Les valeurs tronquées ne doivent pas être inventées.
- Tests SQL en transaction annulée : lecture propre, isolation entre deux utilisateurs, refus de changement de rôle, refus d’insertion pour autrui, refus de transfert de propriétaire, lecture administrateur et refus anonyme. Tous passés sur la base cible.
- Vérification locale : TypeScript, build Vite et neuf contrôles API (`node extract.test.cjs`) réussis.
- Le document fourni et ses données personnelles ne sont pas inclus dans Git.
- Limites : mot de passe du compte administrateur à définir par son titulaire ; parcours navigateur connecté et extraction IA réelle non encore validés. L’extraction passe par /api/extract, authentifié, avec OpenRouter côté serveur. Configurer OPENROUTER_API_KEY et OPENROUTER_MODEL (modèle vision + JSON) dans Vercel. Aucun secret IA injecté dans le bundle. Aucun appel IA réel exécuté sans ces paramètres.
- Avis Supabase : protection contre les mots de passe compromis désactivée ; aucune alerte RLS sur les nouvelles tables.
