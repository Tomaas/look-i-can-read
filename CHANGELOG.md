# Changelog

Toutes les évolutions notables de l'app, une version par livraison.
Format : [Keep a Changelog](https://keepachangelog.com/fr/) adapté, versions
4 chiffres `MAJOR.MINOR.PATCH.MICRO` (fichier `VERSION`).

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
