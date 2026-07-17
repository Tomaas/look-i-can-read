/**
 * OPERATIONS assertion script — générateur, layout, paliers, énoncés.
 *
 * Pins the pure math mini-app modules. Same standalone-runnable pattern as
 * reading-aids.golden.ts (no test runner in this app):
 *   bun run src/lib/operations/__tests__/operations.golden.ts
 * (wired as `bun run test:operations`). Exits non-zero on any failure.
 * Pure modules (no env import) — no SKIP_ENV_VALIDATION needed.
 *
 * Ce que ces assertions verrouillent (décisions eng-review) :
 *  - déterminisme total à seed égal (goldens reproductibles) ;
 *  - soustraction jamais négative, résultats ≤ 9999 (4 rangs, D12-C) ;
 *  - contrainte insatisfaisable → erreur typée, jamais de boucle infinie ;
 *  - layout partagé écran/print (3A) : géométrie stable et exacte ;
 *  - paliers purement descriptifs (T2-A) : pas d'évaluation ici ;
 *  - énoncés (D11-C) : déterministes, calmes par construction.
 */

import {
  countBorrows,
  countCarries,
  countMultCarries,
  DEFAULT_SERIE_SIZE,
  enonceFor,
  generateOperation,
  generateSerie,
  layoutOperation,
  MAX_RESULT,
  MAX_SERIE_SIZE,
  MIN_SERIE_SIZE,
  matchesQuota,
  PALIERS,
  palierById,
  RANK_COLORS,
  RANK_LABELS,
  resolvePalier,
  UnsatisfiableConstraintError,
} from "~/lib/operations";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures++;
    console.error(`✗ ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

/* ----------------------------- Arithmétique ----------------------------- */

check("countCarries(47, 25) = 1", countCarries(47, 25) === 1);
check("countCarries(23, 45) = 0", countCarries(23, 45) === 0);
check("countCarries(999, 1) = 3", countCarries(999, 1) === 3);
check("countBorrows(52, 27) = 1", countBorrows(52, 27) === 1);
check("countBorrows(48, 25) = 0", countBorrows(48, 25) === 0);
check("countBorrows(100, 1) = 2", countBorrows(100, 1) === 2);
check("countMultCarries(24, 2) = 0", countMultCarries(24, 2) === 0);
check("countMultCarries(48, 7) = 2", countMultCarries(48, 7) === 2);

/* ------------------- Identité PRNG (goldens reproductibles) ------------------- */

// Valeurs EXACTES épinglées (même esprit que prompt-identity.golden.ts) :
// si mulberry32, l'échantillonnage ou la dérivation de seeds change, ces
// pins cassent — c'est voulu, les goldens sont l'identité du générateur.
{
  const op = generateOperation(PALIERS[0].constraints, 1);
  check(
    "identité PRNG: palier 0, seed 1 → 32 + 2 = 34 (0 retenue)",
    op.a === 32 && op.b === 2 && op.expected === 34 && op.carries === 0,
    JSON.stringify(op),
  );
  const serie = generateSerie(PALIERS[0].constraints, 2026, 3);
  check(
    "identité PRNG: dérivation des seeds de série (2026 → 62806, 70725, 78644)",
    JSON.stringify(serie.map((o) => o.seed)) ===
      JSON.stringify([62806, 70725, 78644]),
    JSON.stringify(serie.map((o) => o.seed)),
  );
}

/* ------------------------- Générateur : invariants ------------------------- */

// La sémantique des quotas vit dans matchesQuota (exportée) — pas de copie ici.
const quotaHolds = matchesQuota;

// Précondition exécutable : countBorrows(a &lt; b) lève au lieu de boucler.
{
  let threw = false;
  try {
    countBorrows(1, 2);
  } catch (e) {
    threw = e instanceof RangeError;
  }
  check("countBorrows(1, 2) → RangeError (précondition a ≥ b gardée)", threw);
}

// Bornes de série : source unique pour l'UI et la validation zod.
check(
  "bornes de série: MIN=1 ≤ DEFAULT=3 ≤ MAX=6",
  MIN_SERIE_SIZE === 1 &&
    MAX_SERIE_SIZE === 6 &&
    DEFAULT_SERIE_SIZE >= MIN_SERIE_SIZE &&
    DEFAULT_SERIE_SIZE <= MAX_SERIE_SIZE,
);

for (const palier of PALIERS) {
  let allValid = true;
  let firstProblem = "";
  for (let seed = 1; seed <= 200; seed++) {
    const op = generateOperation(palier.constraints, seed);
    const trueResult = {
      addition: op.a + op.b,
      soustraction: op.a - op.b,
      multiplication: op.a * op.b,
    }[op.op];
    const expectedOk = op.expected === trueResult;
    const quota =
      op.op === "soustraction"
        ? palier.constraints.borrows
        : palier.constraints.carries;
    const quotaOk = quotaHolds(quota, op.carries);
    const boundsOk =
      op.expected <= MAX_RESULT &&
      (op.op !== "soustraction" || op.expected > 0);
    if (!(expectedOk && quotaOk && boundsOk)) {
      allValid = false;
      firstProblem = `seed ${seed}: ${op.a} ${op.op} ${op.b} = ${op.expected} (carries ${op.carries})`;
      break;
    }
  }
  check(`palier ${palier.id}: 200 seeds valides`, allValid, firstProblem);
}

// Déterminisme : même seed → même opération ; seeds voisins → variété.
{
  const c = PALIERS[1].constraints;
  const a1 = generateOperation(c, 42);
  const a2 = generateOperation(c, 42);
  check(
    "déterminisme: seed 42 rejoue exactement la même opération",
    a1.a === a2.a && a1.b === a2.b && a1.expected === a2.expected,
  );
  const varied = new Set(
    Array.from({ length: 50 }, (_, i) =>
      JSON.stringify(generateOperation(c, i + 1)),
    ),
  );
  check(
    "variété: 50 seeds → au moins 30 opérations distinctes",
    varied.size >= 30,
  );
}

// Contrainte insatisfaisable → erreur typée (jamais de boucle infinie).
{
  let threw = false;
  try {
    generateOperation(
      {
        op: "addition",
        aDigits: { min: 1, max: 1 },
        bDigits: { min: 1, max: 1 },
        carries: "some",
      },
      7,
    );
    // 1 chiffre + 1 chiffre AVEC retenue existe (ex. 7+8) — celle-ci est satisfaisable.
    threw = false;
  } catch {
    threw = true;
  }
  check(
    "contrainte satisfaisable: 1+1 chiffre avec retenue ne lève pas",
    !threw,
  );

  let impossibleThrew = false;
  try {
    generateOperation(
      {
        op: "soustraction",
        aDigits: { min: 1, max: 1 },
        bDigits: { min: 1, max: 1 },
        borrows: "some",
      },
      7,
    );
  } catch (e) {
    impossibleThrew = e instanceof UnsatisfiableConstraintError;
  }
  check(
    "contrainte insatisfaisable (emprunt sur 1 chiffre) → UnsatisfiableConstraintError",
    impossibleThrew,
  );
}

// Multiplication : ×0 et ×1 n'apprennent rien à poser — jamais générés.
{
  let allB2Plus = true;
  for (const palier of PALIERS) {
    if (palier.constraints.op !== "multiplication") {
      continue;
    }
    for (let seed = 1; seed <= 200; seed++) {
      if (generateOperation(palier.constraints, seed).b < 2) {
        allB2Plus = false;
      }
    }
  }
  check("multiplication: b ≥ 2 toujours (jamais ×0 ni ×1)", allB2Plus);
}

// Soustraction : a > b strict par construction (0 n'apprend rien à poser).
{
  let strict = true;
  for (const palier of PALIERS) {
    if (palier.constraints.op !== "soustraction") {
      continue;
    }
    for (let seed = 1; seed <= 200; seed++) {
      const o = generateOperation(palier.constraints, seed);
      if (o.a <= o.b) {
        strict = false;
      }
    }
  }
  check("soustraction: a > b strict (jamais de résultat nul)", strict);
}

// Série : taille, déterminisme, même palier.
{
  const serie = generateSerie(PALIERS[0].constraints, 2026, DEFAULT_SERIE_SIZE);
  const replay = generateSerie(
    PALIERS[0].constraints,
    2026,
    DEFAULT_SERIE_SIZE,
  );
  check("série: taille par défaut = 3", serie.length === 3);
  check(
    "série: déterministe à seed égal",
    JSON.stringify(serie) === JSON.stringify(replay),
  );
}

/* ------------------------------ Layout (3A) ------------------------------ */

{
  const l = layoutOperation({
    op: "addition",
    a: 47,
    b: 25,
    expected: 72,
    carries: 1,
    seed: 1,
  });
  check("layout 47+25: 2 colonnes", l.columnCount === 2);
  check("layout 47+25: signe +", l.sign === "+");
  check(
    "layout 47+25: retenue possible sur les dizaines seulement",
    JSON.stringify(l.carrySlots) === JSON.stringify([true, false]),
  );
  check(
    "layout 47+25: rangées ['4','7'] / ['2','5']",
    JSON.stringify(l.operandRows) ===
      JSON.stringify([
        ["4", "7"],
        ["2", "5"],
      ]),
  );
  check(
    "layout 47+25: résultat ['7','2']",
    JSON.stringify(l.expectedDigits) === JSON.stringify(["7", "2"]),
  );
}

{
  // Le résultat déborde d'une colonne : la grille s'aligne sur lui.
  const l = layoutOperation({
    op: "addition",
    a: 85,
    b: 61,
    expected: 146,
    carries: 1,
    seed: 1,
  });
  check("layout 85+61: 3 colonnes (résultat 146)", l.columnCount === 3);
  check(
    "layout 85+61: opérandes alignés à droite avec case vide",
    JSON.stringify(l.operandRows) ===
      JSON.stringify([
        ["", "8", "5"],
        ["", "6", "1"],
      ]),
  );
}

{
  const l = layoutOperation({
    op: "soustraction",
    a: 52,
    b: 27,
    expected: 25,
    carries: 1,
    seed: 1,
  });
  check("layout 52−27: signe −", l.sign === "−");
  const m = layoutOperation({
    op: "multiplication",
    a: 24,
    b: 3,
    expected: 72,
    carries: 1,
    seed: 1,
  });
  check("layout 24×3: signe ×", m.sign === "×");
  check(
    "layout 24×3: b aligné à droite ['','3']",
    JSON.stringify(m.operandRows[1]) === JSON.stringify(["", "3"]),
  );
}

{
  // 4 rangs (D12-C) : jusqu'aux milliers, jamais au-delà.
  const l = layoutOperation({
    op: "addition",
    a: 4736,
    b: 2851,
    expected: 7587,
    carries: 1,
    seed: 1,
  });
  check("layout milliers: 4 colonnes max", l.columnCount === 4);
}

{
  // Cas limite 1 colonne : jamais de case de retenue au-dessus des unités.
  const l = layoutOperation({
    op: "soustraction",
    a: 9,
    b: 2,
    expected: 7,
    carries: 0,
    seed: 1,
  });
  check(
    "layout 9−2 (1 colonne): aucune case de retenue, aucun remplissage",
    l.columnCount === 1 &&
      JSON.stringify(l.carrySlots) === JSON.stringify([false]) &&
      JSON.stringify(l.operandRows) === JSON.stringify([["9"], ["2"]]) &&
      JSON.stringify(l.expectedDigits) === JSON.stringify(["7"]),
  );
}

{
  // Invariant pour toute opération générée : géométrie cohérente + jamais
  // de retenue sur les unités (colonne la plus à droite).
  let coherent = true;
  let firstProblem = "";
  for (const palier of PALIERS) {
    for (let seed = 1; seed <= 60; seed++) {
      const o = generateOperation(palier.constraints, seed);
      const l = layoutOperation(o);
      const widthsOk =
        l.carrySlots.length === l.columnCount &&
        l.operandRows.every((r) => r.length === l.columnCount) &&
        l.expectedDigits.length === l.columnCount;
      const unitsFree = l.carrySlots[l.columnCount - 1] === false;
      const digitsMatch =
        l.expectedDigits.join("") === String(o.expected) &&
        Number(l.operandRows[0].join("")) === o.a &&
        Number(l.operandRows[1].join("")) === o.b;
      if (!(widthsOk && unitsFree && digitsMatch)) {
        coherent = false;
        firstProblem = `${palier.id} seed ${seed}: ${JSON.stringify(l)}`;
        break;
      }
    }
  }
  check(
    "layout: géométrie cohérente sur tous les paliers × 60 seeds",
    coherent,
    firstProblem,
  );
}

/* --------------------------- Paliers (T2-A) --------------------------- */

check(
  "paliers: ordres strictement croissants",
  (() => {
    for (let i = 1; i < PALIERS.length; i++) {
      if (PALIERS[i].ordre <= PALIERS[i - 1].ordre) {
        return false;
      }
    }
    return true;
  })(),
);
check(
  "paliers: le premier est l'addition sans retenue (progression Montessori)",
  PALIERS[0].constraints.op === "addition" &&
    PALIERS[0].constraints.carries === "none",
);
check(
  "resolvePalier: id inconnu ou null → premier palier, jamais d'erreur",
  resolvePalier("palier-disparu").id === PALIERS[0].id &&
    resolvePalier(null).id === PALIERS[0].id,
);
check(
  "paliers: aucune notion d'évaluation (pas de champ score/confort/temps)",
  PALIERS.every((p) => !("comfort" in p) && !("score" in p) && !("time" in p)),
);
check(
  "paliers: ids uniques (clés stables pour la DB et resolvePalier)",
  new Set(PALIERS.map((p) => p.id)).size === PALIERS.length,
);
check(
  "palierById: id connu → le palier, id inconnu → undefined",
  palierById("mult-1-chiffre")?.id === "mult-1-chiffre" &&
    palierById("nope") === undefined,
);
check(
  "resolvePalier: undefined / '' → premier palier ; id valide conservé",
  resolvePalier(undefined).id === PALIERS[0].id &&
    resolvePalier("").id === PALIERS[0].id &&
    resolvePalier("sous-emprunt").id === "sous-emprunt",
);
check(
  "rangs (D12-C): 4 rangs exactement, couleurs du matériel épinglées",
  MAX_RESULT === 9999 &&
    Object.keys(RANK_LABELS).length === 4 &&
    RANK_COLORS[0] === "vert" &&
    RANK_COLORS[1] === "bleu" &&
    RANK_COLORS[2] === "rouge" &&
    RANK_COLORS[3] === "vert-mille",
);

/* --------------------------- Énoncés (D11-C) --------------------------- */

{
  const op = generateOperation(PALIERS[0].constraints, 11);
  const e1 = enonceFor(op, { hero: "Arsène", doudou: "Doudou" });
  const e2 = enonceFor(op, { hero: "Arsène", doudou: "Doudou" });
  check("énoncé: déterministe à opération égale", e1 === e2);
  check("énoncé: contient le héros", e1.includes("Arsène"));
  check(
    "énoncé: contient les deux nombres",
    e1.includes(String(op.a)) && e1.includes(String(op.b)),
  );
  check(
    "énoncé: une seule phrase courte",
    e1.split(".").length <= 2 && e1.length < 90,
  );

  const sansDoudou = enonceFor(op, { hero: "Léa" });
  check("énoncé: fonctionne sans doudou", sansDoudou.includes("Léa"));

  // Calme par construction : aucun mot d'enjeu ne peut sortir des gabarits.
  const FORBIDDEN = [
    "bravo",
    "gagné",
    "perdu",
    "vite",
    "erreur",
    "faux",
    "point",
  ];
  let calm = true;
  for (const palier of PALIERS) {
    for (let seed = 1; seed <= 60; seed++) {
      const o = generateOperation(palier.constraints, seed);
      const phrase = enonceFor(o, {
        hero: "Arsène",
        doudou: "Doudou",
      }).toLowerCase();
      if (FORBIDDEN.some((w) => phrase.includes(w))) {
        calm = false;
        break;
      }
    }
  }
  check("énoncés: aucun terme d'enjeu sur tous les paliers × 60 seeds", calm);
}

// Identité des gabarits (comme prompt-identity) : la phrase exacte est
// épinglée — un changement de gabarit doit se voir dans le golden.
{
  const op = generateOperation(PALIERS[0].constraints, 1); // 32 + 2
  check(
    "énoncé épinglé (avec doudou): variante compagnon exacte",
    enonceFor(op, { hero: "Arsène", doudou: "Doudou" }) ===
      "Arsène range 32 plumes, Doudou en apporte 2.",
    enonceFor(op, { hero: "Arsène", doudou: "Doudou" }),
  );
  check(
    "énoncé épinglé (sans doudou): variante solo exacte",
    enonceFor(op, { hero: "Arsène" }) ===
      "Arsène a 32 plumes et en trouve encore 2.",
    enonceFor(op, { hero: "Arsène" }),
  );
}

// Couverture des branches de gabarits : avec un doudou, les deux variantes
// (compagnon / solo) sortent bien selon la seed — addition ET soustraction.
{
  const addVariants = new Set<string>();
  const sousVariants = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    const add = generateOperation(PALIERS[0].constraints, seed);
    addVariants.add(
      enonceFor(add, { hero: "A", doudou: "D" }).includes("apporte")
        ? "compagnon"
        : "solo",
    );
    const sous = generateOperation(PALIERS[3].constraints, seed);
    sousVariants.add(
      enonceFor(sous, { hero: "A", doudou: "D" }).includes("donne")
        ? "compagnon"
        : "solo",
    );
  }
  check(
    "énoncé addition: les deux variantes (compagnon/solo) apparaissent",
    addVariants.size === 2,
  );
  check(
    "énoncé soustraction: les deux variantes (compagnon/solo) apparaissent",
    sousVariants.size === 2,
  );

  const mult = generateOperation(PALIERS[5].constraints, 3);
  const multPhrase = enonceFor(mult, { hero: "Arsène", doudou: "Doudou" });
  check(
    "énoncé multiplication: gabarit paniers, sans compagnon",
    multPhrase.includes("paniers") && !multPhrase.includes("Doudou"),
    multPhrase,
  );
}

/* --------------------------------- Bilan --------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} assertion(s) en échec.`);
  process.exit(1);
}
console.log("\nToutes les assertions operations passent.");
