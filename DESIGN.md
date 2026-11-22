# ADT — Poste de contrôle pétrole

## Direction appliquée

Variante A « Le poste de contrôle » : une interface de travail claire, à navigation pétrole et surfaces claires, centrée sur l’import, l’extraction puis la vérification. La décoration reste limitée à l’accueil ; les données et les actions dominent les écrans de travail.

## Identité

- Fond : `#f4f7f7` ; surfaces : blanc ; texte : `#12252b`.
- Navigation : `#123d46` ; action principale : `#087f8c` ; accent : `#c9ecef`.
- Typographie : Inter si disponible, sinon les polices système locales. Aucune requête de police distante requise.
- Surfaces à rayons de 7 à 16 px, séparateurs fins, ombres réservées à l’illustration de document.
- Un seul style primaire pour extraire et sauvegarder ; les actions secondaires ont un fond blanc et une bordure.

## Composition

Accueil : titre orienté tâche, introduction pétrole, deux cartes de formats et trois étapes de traitement. Les éléments illustratifs ne représentent pas des données réelles et sont masqués aux technologies d’assistance.

Extraction : en-tête contextualisé, étapes Documents / Extraction / Vérification, panneau de fichiers et résumé de session. Les noms longs sont tronqués visuellement avec le nom complet accessible. Les états sont nommés en texte ; aucun pourcentage simulé n’est présenté à l’utilisateur.

Résultats : tableau à défilement horizontal interne, en-têtes et actions de modification fixes, boutons d’export et de sauvegarde visibles, champs d’édition nommés par colonne et ligne. Les colonnes existantes sont conservées.

Connexion : panneau de marque et formulaire clair. Chaque champ possède un label associé et une indication d’autocomplétion adaptée.

## Responsive et interaction

- Bureau : sidebar de 250 px, rétractable à 78 px.
- Tablette : navigation compacte ; résumé de session sous la liste à moins de 850 px.
- Mobile : navigation horizontale nommée, formulaires et cartes sur une colonne ; illustration décorative supprimée.
- Focus visible, lien d’évitement, messages d’erreur annoncés, résultats de sauvegarde annoncés.
- Mouvement limité aux retours de survol et indicateurs de chargement ; `prefers-reduced-motion` désactive animations et transitions.

## Limites de qualification

Les règles responsive et d’accessibilité sont implémentées dans le code. Elles ne constituent pas une certification WCAG : navigation clavier, lecteur d’écran, contrastes calculés et rendu sur appareils restent à vérifier en conditions réelles.
