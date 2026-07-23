# Changelog

Toutes les évolutions notables de l'app, une version par livraison.
Format : [Keep a Changelog](https://keepachangelog.com/fr/) adapté, versions
4 chiffres `MAJOR.MINOR.PATCH.MICRO` (fichier `VERSION`).

## [0.4.1.0] - 2026-07-23

### Added

- **L'étagère de calcul change avec les jours** : les plateaux ne montrent
  plus toujours les mêmes scènes. Chaque famille a maintenant plusieurs
  ambiances appariées scène + phrase — marrons, feuilles ou fleurs pour
  l'addition ; donner au doudou ou ranger dans sa boîte pour la
  soustraction ; paniers, bols ou sacs pour la multiplication — et
  l'étagère est préparée « pendant la nuit » : elle change d'un jour à
  l'autre, jamais sous les yeux de l'enfant, et reste identique toute la
  journée (même si la fenêtre reste ouverte passé minuit).
- **Les petites histoires des calculs varient davantage** : la
  multiplication ne remplit plus toujours des paniers (boîtes, corbeilles,
  sacs et bols entrent dans la ronde), la soustraction alterne entre
  donner, offrir ou prêter au doudou et ranger, poser ou rapporter à la
  maison, et l'addition gagne aussi de nouvelles tournures. Une série
  interrompue reprend toujours mot pour mot les mêmes énoncés.

### Changed

- Sur l'étagère des calculs, la flèche « retour » (qui doublonnait la croix
  de la fenêtre) et le trait de séparation sous les plateaux ont été
  retirés : fermer la fenêtre est LE geste de sortie ; la flèche ne reste
  qu'en série, pour « reposer le plateau ».
- Les icônes du bureau et le portrait de l'écran d'accueil montrent
  désormais la petite main du pointeur, comme tout ce qui se clique.

### Fixed

- Les énoncés qui ne mettent pas en scène le doudou gardent exactement le
  même libellé que le doudou soit chargé ou non : une base de données
  lente au chargement ne peut plus re-formuler ces phrases-là d'une série
  reprise. (Ceux qui citent le doudou suivent, eux, la configuration du
  moment — c'est leur rôle.)

## [0.4.0.0] - 2026-07-22

### Added

- **Le bureau d'Arsène** : l'accueil devient un petit ordinateur calme.
  L'app s'ouvre sur l'écran de session — le portrait de l'enfant (son héros),
  son prénom, un clic pour entrer, jamais de mot de passe — puis sur un vrai
  bureau : trois icônes (Histoires, Calculs, Bibliothèque) posées sur un
  lavis crème, avec un soleil pâle et une colline sauge à l'horizon.
- Chaque activité s'ouvre dans une **vraie fenêtre** : barre de titre avec le
  nom et le pictogramme de l'app, grande croix douce pour fermer, et la
  fenêtre se déplace en tirant sa barre de titre — la barre ne peut jamais
  sortir de l'écran, et chaque ouverture repart centrée. Sur un petit écran,
  la fenêtre occupe tout l'espace et le déplacement s'efface.
- Les gestes du vrai ordinateur s'apprennent tels quels : un clic
  sélectionne une icône (son nom se surligne, comme sur un vrai bureau), le
  **double-clic l'ouvre** — avec le délai du système, jamais un seuil
  maison — et Entrée fonctionne aussi.
- Le rituel **« Ranger le bureau »**, discret dans un coin, referme la
  session vers le portrait. Session fermée, toute l'app se présente d'abord
  par le portrait : ni le bouton Retour ni un lien direct ne sautent le
  rituel.

### Changed

- Une histoire ou une série de calcul en cours **reprend exactement** après
  fermeture de sa fenêtre — le cadre n'introduit aucune perte, et une page
  ouverte depuis une liste défilée repart toujours en haut.
- L'espace parent (/parents) reste volontairement hors du bureau : pas
  d'icône, accès direct par l'adresse, présentation inchangée.
- L'impression des livrets et des fiches depuis une fenêtre rend exactement
  comme avant : le cadre disparaît entièrement du papier.

### Fixed

- Un déplacement de fenêtre interrompu (redimensionnement, Échap, changement
  d'onglet) ne peut plus laisser la fenêtre coincée hors de l'écran.
- Si le stockage local de l'appareil est indisponible, la session vit en
  mémoire le temps de l'onglet : l'écran-portrait ne redevient jamais une
  barrière répétée.
- Un souci de connexion pendant l'ouverture d'une activité ne fige plus les
  icônes du bureau : elles redeviennent utilisables d'elles-mêmes.
- Un prénom accentué reconnaît son héros quelle que soit la façon dont
  l'accent a été saisi dans l'espace parent.

## [0.3.1.0] - 2026-07-20

### Changed

- Les illustrations annoncent désormais leurs dimensions à la page : plus de
  petit saut de mise en page pendant qu'une image de la bibliothèque, d'une
  histoire ou d'un livret imprimé finit de charger.
- Grand ménage de printemps du code avec l'adoption des presets ultracite
  (Biome) : imports, attributs et clés triés partout, réécritures plus
  explicites (comparaisons null/undefined précises, expressions régulières
  hoistées, `+= 1`) — sans aucun changement de comportement, les suites
  golden le garantissent.
- L'ordre des champs des schémas d'histoire envoyés au modèle (titre puis
  récit puis choix) est maintenant verrouillé par un test : une future passe
  de formatage ne pourra plus le réordonner en silence.

### Fixed

- Le tri automatique des clés avait déplacé des commentaires de section
  (variables d'environnement, schéma de la base) sous les mauvaises entrées ;
  les groupes sémantiques sont restaurés et protégés.

## [0.3.0.0] - 2026-07-20

### Added

- L'étagère de plateaux : en entrant dans « Poser des calculs », l'enfant
  choisit désormais lui-même sa famille d'opération — un plateau par famille
  préparée par le parent, posé sur une planche, avec sa petite scène fixe
  (des marrons pour les additions, le doudou pour les soustractions, des
  paniers pour les multiplications), le signe en médaillon et une phrase
  courte. Une famille non préparée n'apparaît simplement pas.
- Chaque plateau se souvient de sa série en cours : un plateau « sorti » de
  la planche se reprend exactement où il en était, même après un détour par
  un autre plateau — et une série commencée avant cette version est
  retrouvée elle aussi.
- La flèche fait maintenant le trajet en deux temps : depuis la série elle
  « repose le plateau » (retour à l'étagère), depuis l'étagère elle rend à
  l'accueil. La fin d'une série redevient un instant : 🌿, puis l'étagère
  réapparaît avec le plateau rangé.
- Côté parents, la page des calculs se réorganise en une carte par famille
  d'opérations : activer/désactiver chaque famille, choisir son palier
  propre, imprimer une fiche A5 par famille. Les conséquences sont dites
  avant le geste (« Changer le palier range la série en cours »), et au
  moins une famille reste toujours sur l'étagère.
- L'étagère s'adapte à l'écran : les plateaux se compriment sans jamais
  passer sous la planche, s'empilent sur petit écran (chacun avec sa
  planche), s'annoncent au lecteur d'écran (« Prendre le plateau des
  additions — série en cours ») et respectent la préférence « réduire les
  animations ».

### Changed

- Les réglages du calcul vivent désormais par famille d'opérations (la
  migration 0010 convertit l'ancien réglage unique en préservant le palier
  choisi — exécuter `bun run db:migrate` avec le déploiement) ; la taille de
  série reste globale, et celle d'un ancien appareil est conservée.
- La documentation projet décrit l'étagère de plateaux et son cycle de vie
  des données (CLAUDE.md, schéma, backlog).

### Fixed

- Une visite hors ligne (ou avant la migration) ne peut plus faire oublier
  une série en cours : le grand ménage des séries locales n'a lieu que sur
  des réglages réellement lus en base, et la migration d'une série d'avant
  l'étagère ne s'efface qu'après vérification de sa nouvelle place.
- Si les réglages ne se chargent pas, la page parents l'affiche calmement au
  lieu de présenter un formulaire vide qui aurait pu écraser les vrais
  réglages en croyant les réparer.
- Une série au contenu impossible à régénérer se range d'elle-même au lieu
  de rester sur l'écran « L'atelier est rangé. » ; les messages d'erreur
  côté parents restent en français calme, sans détail technique.
- `bun run lint` fonctionne aussi depuis un espace de travail d'agent
  (l'exclusion Biome des worktrees est ancrée à la racine de la config).

## [0.2.2.1] - 2026-07-20

### Changed

- L'app s'appelle maintenant « L'atelier d'Arsène » (dérivé du prénom :
  « L'atelier de Léa » pour un autre foyer, « Le petit atelier » sans prénom) —
  un nom qui couvre les histoires, les calculs et les prochains plateaux.
  L'onglet du navigateur et l'écran d'accueil suivent au prochain déploiement ;
  les livrets imprimés gardent leur pied de page « Une histoire d'Arsène ».
- La description de l'app devient « Un endroit calme pour lire, inventer et
  calculer. »

## [0.2.2.0] - 2026-07-19

### Changed

- Les fonctions serveur utilisent l'API de validation actuelle de TanStack
  Start (`validator` remplace l'alias déprécié `inputValidator`, strictement
  équivalent) — le serveur de dev démarre désormais sans le mur
  d'avertissements de dépréciation. Aucun changement de comportement.

### Fixed

- `bun run lint` ne casse plus quand un espace de travail d'agent existe sous
  `.claude/worktrees/` (exclusion Biome + entrée `.gitignore`) ; les réglages
  locaux `.claude/settings.local.json` restent aussi hors du dépôt.

## [0.2.1.0] - 2026-07-18

### Added

- Atelier calcul : les chiffres du pavé doux se glissent maintenant du bout du
  doigt directement dans les cases de l'opération — la tuile suit le doigt et
  s'encre à l'endroit posé, comme un crayon qui se pose. Le tap d'avant marche
  toujours exactement pareil ; les deux gestes se mélangent librement.

### Changed

- Pendant un glissement, une seule case s'illumine à la fois (celle sous le
  doigt) — l'ancienne sélection s'éteint le temps du geste.
- Le dépôt est indulgent pour les petits doigts : si le doigt est juste à côté
  d'une case mais que la tuile la chevauche, le chiffre s'y pose quand même.
- La petite case de retenue est un peu plus facile à toucher (cible tactile
  élargie à 44 px de haut).

## [0.2.0.0] - 2026-07-17

### Added

- L'accueil devient une étagère à deux portes : « Histoire où tu choisis » et
  la nouvelle mini-app « Poser des calculs » — deux activités indépendantes,
  sans aucune mécanique croisée.
- Atelier `/calcul` : une série courte d'opérations posées (3 par défaut),
  présentée comme des plateaux qui se rangent — l'enfant écrit librement au
  pavé doux (tout s'encre comme au crayon, jamais de rouge, jamais de note),
  compare lui-même avec la version résolue quand il a fini, et l'atelier se
  range de lui-même à la fin de la série. Une opération quittée en cours
  reprend exactement où elle en était.
- Énoncés du monde de l'enfant : chaque opération peut s'habiller d'une courte
  phrase avec le héros et le doudou de la famille (« Arsène range 24 marrons,
  Doudou en apporte 8 ») — générée localement, sans IA.
- Fiches A5 à imprimer : des opérations posées à compléter au crayon, dans le
  même format que les livrets d'histoires, calibrées sur le palier choisi.
- Espace parent `/parents/calcul` : choix du palier (7 paliers, des additions
  sans retenue aux multiplications posées — c'est l'adulte qui décide, jamais
  un algorithme), taille des séries, impression des fiches.
- Le calcul fonctionne même sans réseau : le palier est mémorisé sur
  l'appareil et l'enfant ne voit jamais d'erreur.

### Changed

- La page d'accueil présente désormais les deux activités côte à côte ; la
  bibliothèque reste accessible comme avant.

### Infrastructure

- Nouveau module pur `src/lib/operations` (générateur déterministe seedé,
  géométrie partagée écran/print, échelle des paliers, énoncés à gabarits),
  verrouillé par 60 vérifications golden — certaines balayant tous les
  paliers × 60 seeds (`bun run test:operations`).
- Table `math_skills` (migration additive 0009) pour le palier et la taille
  de série choisis par le parent.
