# TODOS

## Calcul (mini-app opérations)

### Demander à l'éducatrice où en est Arsène + l'observer manipuler
**Priority:** P1
**Contexte :** L'assignment du design doc (`~/.gstack/projects/Tomaas-look-i-can-read/user-main-design-20260717-165844.md`). À la rentrée (fin août) : perles dorées ? jeu des timbres déjà présenté ? quelle opération ? Observer ses mains sur le vrai matériel sans l'aider — le design du geste tactile (tranche 5) doit copier ce qu'il fait réellement. **GO/NO-GO** : si les timbres n'ont pas été présentés en classe, l'app ne les introduit pas.
**Depends on:** la rentrée scolaire.

### Tranche 5 — le geste timbres à l'écran
**Priority:** P2
**Contexte :** `stamp-engine.ts` (machine à états pure : place/unplace/exchange/ink, `isColumnReady`, 4 rangs) + `stamp-board.tsx` (`@dnd-kit/react` épinglé — décision eng-review 1B — ou tap-pour-poser selon l'observation), échange 10→1 avec la retenue écrite pendant le geste, encrage gaté par colonne résolue aux paliers avec matériel, fondu du matériel attaché au palier (les types `Fondu`/`Rank` sont déjà réservés dans `src/lib/operations/types.ts`). Golden tests sur l'engine.
**Depends on:** l'assignment ci-dessus (GO/NO-GO école).

### Tranche 6 — soustraction et multiplication au matériel
**Priority:** P2
**Contexte :** Soustraction = seul le diminuende posé, emprunt = échange inverse 1 bleu → 10 verts (variante exacte à confirmer avec l'école) ; multiplication = ligne posée en un geste (« poser encore 48 ») ; spec détaillée de la multiplication à 2 chiffres (produits partiels, décalage) à écrire à ce moment-là.
**Depends on:** Tranche 5.

## Completed
