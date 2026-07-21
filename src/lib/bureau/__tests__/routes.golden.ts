/**
 * ROUTES assertion script — intégrité des URLs publiques (eng-review D24-A).
 *
 * La relocalisation des mini-apps sous `src/app/_bureau/` (préfixe `_` =
 * layout sans segment d'URL) ne doit changer AUCUNE URL publique, et aucun
 * id d'ancienne route ne doit subsister. Vérification TEXTUELLE sur
 * routeTree.gen.ts + les fichiers de src/app : importer le vrai routeTree
 * tirerait l'env serveur et le CSS — hors de portée d'un script bun pur.
 *   bun run src/lib/bureau/__tests__/routes.golden.ts
 * (wired as `bun run test:routes`). Exits non-zero on any failure.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(`✗ ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const routeTree = readFileSync("src/routeTree.gen.ts", "utf8");

/* --------------------- Les URLs publiques, inchangées --------------------- */

// Chaque chemin doit exister comme fullPath dans l'arbre généré — la ligne
// `fullPath: '/aventure/'` est l'empreinte de l'URL réellement servie.
const URLS_PUBLIQUES = [
  "/",
  "/aventure/",
  "/aventure/$id",
  "/calcul/",
  "/bibliotheque",
  "/parents/",
  "/parents/calcul",
  "/data/$",
];
for (const url of URLS_PUBLIQUES) {
  check(
    `URL publique inchangée: ${url}`,
    routeTree.includes(`fullPath: '${url}'`)
  );
}

// La layout est bien pathless : `/_bureau` existe comme id mais n'introduit
// AUCUN segment d'URL (aucun fullPath ne commence par /_bureau).
check("la layout _bureau existe (id) …", routeTree.includes("id: '/_bureau'"));
check(
  "… et n'apparaît dans aucune URL (pathless)",
  !routeTree.includes("fullPath: '/_bureau")
);

/* ------------------- Aucun id d'ancienne route résiduel ------------------- */

// Les ids des routes déménagées ont été RÉÉCRITS (D24-A) : plus aucun
// createFileRoute avec un ancien id, nulle part sous src/app.
const ANCIENS_IDS = [
  'createFileRoute("/aventure/")',
  'createFileRoute("/aventure/$id")',
  'createFileRoute("/calcul/")',
  'createFileRoute("/bibliotheque")',
];
const NOUVEAUX_IDS = [
  'createFileRoute("/_bureau/aventure/")',
  'createFileRoute("/_bureau/aventure/$id")',
  'createFileRoute("/_bureau/calcul/")',
  'createFileRoute("/_bureau/bibliotheque")',
];

function listeFichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listeFichiers(path) : [path];
  });
}

const sources = listeFichiers("src/app")
  .filter((p) => p.endsWith(".tsx") || p.endsWith(".ts"))
  .map((p) => ({ contenu: readFileSync(p, "utf8"), path: p }));

for (const ancien of ANCIENS_IDS) {
  const restes = sources.filter((s) => s.contenu.includes(ancien));
  check(
    `aucun id d'ancienne route résiduel: ${ancien}`,
    restes.length === 0,
    restes.map((r) => r.path).join(", ")
  );
}
for (const nouveau of NOUVEAUX_IDS) {
  check(
    `id réécrit présent: ${nouveau}`,
    sources.some((s) => s.contenu.includes(nouveau))
  );
}

// Les anciens emplacements de fichiers n'existent plus (le déménagement est
// complet, pas une copie).
for (const ancien of [
  "src/app/aventure",
  "src/app/calcul",
  "src/app/bibliotheque.tsx",
]) {
  check(`ancien emplacement disparu: ${ancien}`, !existsSync(ancien));
}

// /parents reste HORS de l'OS : aucune route parents sous _bureau.
check(
  "/parents hors de l'OS (jamais sous _bureau)",
  !(
    existsSync("src/app/_bureau/parents") ||
    routeTree.includes("'/_bureau/parents")
  )
);

/* -------------------------------- Verdict -------------------------------- */

if (failures > 0) {
  console.error(`\n${failures} assertion(s) routes en échec.`);
  process.exit(1);
}
console.log("\nToutes les assertions routes passent.");
