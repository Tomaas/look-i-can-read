# TODOS

## Calcul (mini-app opérations)

### Demander à l'éducatrice où en est Arsène + l'observer manipuler
**Priority:** P1
**Contexte :** L'assignment du design doc (`~/.gstack/projects/Tomaas-look-i-can-read/user-main-design-20260717-165844.md`). À la rentrée (fin août) : perles dorées ? jeu des timbres déjà présenté ? quelle opération ? Observer ses mains sur le vrai matériel sans l'aider — le design du geste tactile (tranche 5) doit copier ce qu'il fait réellement. **GO/NO-GO** : si les timbres n'ont pas été présentés en classe, l'app ne les introduit pas.
**Depends on:** la rentrée scolaire.

### Observer le geste de l'étagère après ship (protocole 1 semaine)
**Priority:** P2
**Contexte :** Deux décisions de l'eng-review de l'étagère de plateaux (design doc `user-worktree-selection-design-20260719-112405.md`) ont été prises contre l'avis de la voix extérieure, sur la base d'un protocole d'observation : T6-B (l'étagère s'affiche même à un seul plateau — le geste demeure) et T1 (scènes FIXES par famille — la constance bat la nouveauté). Une semaine après le ship : (a) le tap sur le plateau unique est-il un regard ou un réflexe sans regard ? Si réflexe → friction déguisée en geste, correctif = un `if` (étagère seulement à partir de 2 plateaux). (b) Arsène remarque-t-il/cherche-t-il la scène du plateau ? S'il cherche la nouveauté → rouvrir « scènes vivantes » (scène = premier énoncé de la série, seed pré-engagé + mapping SVG des 10 OBJETS). Les deux correctifs sont quasi gratuits une fois les données là — ne pas trancher sans avoir observé.
**Depends on:** le ship de l'étagère de plateaux.

### Tranche 5 — le geste timbres à l'écran
**Priority:** P2
**Contexte :** `stamp-engine.ts` (machine à états pure : place/unplace/exchange/ink, `isColumnReady`, 4 rangs) + `stamp-board.tsx` (`@dnd-kit/react` épinglé — décision eng-review 1B — ou tap-pour-poser selon l'observation), échange 10→1 avec la retenue écrite pendant le geste, encrage gaté par colonne résolue aux paliers avec matériel, fondu du matériel attaché au palier (les types `Fondu`/`Rank` sont déjà réservés dans `src/lib/operations/types.ts`). Golden tests sur l'engine. NB : le glisser-déposer du pavé (v0.2.1.0) utilise déjà `@dnd-kit/core` — revalider le choix `@dnd-kit/react` de la décision 1B avant de commencer, pour ne pas embarquer deux paquets dnd-kit.
**Depends on:** l'assignment ci-dessus (GO/NO-GO école).

### Tranche 6 — soustraction et multiplication au matériel
**Priority:** P2
**Contexte :** Soustraction = seul le diminuende posé, emprunt = échange inverse 1 bleu → 10 verts (variante exacte à confirmer avec l'école) ; multiplication = ligne posée en un geste (« poser encore 48 ») ; spec détaillée de la multiplication à 2 chiffres (produits partiels, décalage) à écrire à ce moment-là.
**Depends on:** Tranche 5.

## Deploy (Docker/Compose)

### Forwarder les build args de branding dans compose.yml
**Priority:** P2
**Contexte :** Le `Dockerfile` déclare les ARGs `VITE_APP_NAME`,
`VITE_APP_DESCRIPTION` et `VITE_STORY_LABEL` mais `compose.yml` ne forwarde
que `VITE_CHILD_NAME` — un override posé dans `.env` (le chemin documenté par
`.env.example` et `src/config/app.ts`) est silencieusement ignoré par
`bun run deploy`. Gap préexistant relevé par la review adversariale du rename
« L'atelier » (v0.2.2.1) : 3 lignes d'`args` à ajouter, ou documenter que
l'override passe par `compose.override.yml`.

## Design

### Formaliser un DESIGN.md via /design-consultation
**Priority:** P3
**Contexte :** Le langage visuel du projet vit éparpillé entre `src/config/style.ts` (crème #FBF6EC, encre #5A4636, ocre #D89A5B, sauge #A9C9A4, Quicksand, imageStyleSuffix aquarelle), les classes des composants (`rounded-2xl`, ring sauge, ombres douces, boutons ghost `text-muted-foreground text-xl`) et la mémoire des sessions. Deux design reviews de suite (juillet : atelier opérations ; 19/07 : étagère de plateaux) ont dû reconstituer ce système à la main. Une session `/design-consultation` produirait le DESIGN.md qui calibre automatiquement toutes les revues futures — la valeur croît avec la 3e mini-app (timbres, rentrée). Matière première : style.ts + la grammaire existante + les blocs « langage visuel » des design docs.
**Depends on:** rien.

## Completed
