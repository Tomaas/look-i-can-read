/**
 * All the word lists behind the reading aids, exported as growable consts.
 * Every set exists to serve the PRECISION-first principle: when a word is
 * ambiguous or unknown, the rules mark NOTHING rather than risk a wrong gray
 * letter or a wrong arc (a false aid teaches a wrong pronunciation).
 *
 * Matching keys are always lowercased cores with the typographic apostrophe
 * normalized to `'` (see `annotate.ts`).
 */

/* ------------------------------- Liaisons ------------------------------- */

/** Determiners/numerals whose final consonant ALWAYS liaises into a vowel. */
export const LIAISON_DETERMINERS: ReadonlySet<string> = new Set([
  "les",
  "des",
  "ces",
  "mes",
  "tes",
  "ses",
  "nos",
  "vos",
  "leurs",
  "aux",
  "un",
  "deux",
  "trois",
  "six",
  "dix",
  "quels",
  "quelles",
  "quelques",
  "plusieurs",
]);

/** Subject pronouns that liaise into a vowel-initial verb (nous‿avons). */
export const LIAISON_PRONOUNS: ReadonlySet<string> = new Set([
  "nous",
  "vous",
  "ils",
  "elles",
  "on",
]);

/**
 * Prenominal adjectives — they liaise ONLY when the previous word is a
 * determiner (un petit‿ours), never as a predicate (il est grand aussi).
 */
export const LIAISON_ADJECTIVES: ReadonlySet<string> = new Set([
  "petit",
  "petits",
  "petites",
  "grand",
  "grands",
  "grandes",
  "gros",
  "grosses",
  "bon",
  "bons",
  "bonnes",
  "mauvais",
  "premier",
  "premiers",
  "dernier",
  "derniers",
  "jeunes",
  "autres",
]);

/**
 * The determiner gate for `LIAISON_ADJECTIVES`: singular determiners that
 * cannot liaise themselves but license the adjective's liaison.
 */
export const ADJECTIVE_GATE_EXTRAS: ReadonlySet<string> = new Set([
  "le",
  "la",
  "ce",
  "cette",
  "mon",
  "ton",
  "son",
  "ma",
  "ta",
  "sa",
  "notre",
  "votre",
  "leur",
]);

/**
 * Monosyllabic adverbs/prepositions with mandatory liaison (dans‿une).
 * `plus` is deliberately ABSENT: negative `plus` never liaises and cannot be
 * told apart from the comparative without parsing — so it never gets an arc.
 * (Its s CAN be grayed before a consonant — see the contextual rule in
 * `silent-letters.ts`, where /ply/ is the only reading.)
 */
export const LIAISON_ADVERBS_PREPS: ReadonlySet<string> = new Set([
  "en",
  "dans",
  "chez",
  "sans",
  "sous",
  "très",
  "bien",
  "tout",
  "quand",
]);

/** Full-core triggers (elided): c'e(s)t‿un — the t revives under the arc. */
export const LIAISON_CEST: ReadonlySet<string> = new Set(["c'est", "c'était"]);

/**
 * Words that BLOCK an incoming liaison despite their vowel-ish start.
 * (`et`/`ou` block it as targets; `et` also never liaises forward — it is in
 * no trigger class.)
 */
export const LIAISON_TARGET_BLOCK: ReadonlySet<string> = new Set([
  "oui",
  "onze",
  "onzième",
  "huit",
  "huitième",
  "yaourt",
  "yaourts",
  "yoyo",
  "yoga",
  "yéti",
  "et",
  "ou",
]);

/** `y…` words are blocked by default; these two DO accept the liaison. */
export const LIAISON_Y_ALLOW: ReadonlySet<string> = new Set(["y", "yeux"]);

/**
 * H muet words: a liaison may cross into them (les‿heures). Any h-word NOT
 * in this set is treated as h aspiré (default-deny — unknown h never
 * liaises).
 */
export const H_MUET_WORDS: ReadonlySet<string> = new Set([
  "heure",
  "heures",
  "histoire",
  "histoires",
  "herbe",
  "herbes",
  "hiver",
  "homme",
  "hommes",
  "hôpital",
  "hôtel",
  "hôtels",
  "horizon",
  "habit",
  "habits",
  "habitude",
  "habitudes",
  "hirondelle",
  "hirondelles",
  "huile",
  "humide",
  "humides",
  "hélicoptère",
  "hélicoptères",
  "hippopotame",
  "hippopotames",
]);

/**
 * H aspiré words: the liaison pass never consults them (default-deny already
 * blocks them) but the contextual `plus` rule DOES — `plus haut` grays its s
 * only because `haut` is a KNOWN h aspiré (an unknown h might be muet, hence
 * liaison territory). Animal-story-heavy on purpose. Must stay disjoint from
 * `H_MUET_WORDS` (asserted in tests).
 */
export const H_ASPIRE_WORDS: ReadonlySet<string> = new Set([
  "héros",
  "hérisson",
  "hérissons",
  "hibou",
  "hiboux",
  "haie",
  "haies",
  "haut",
  "hauts",
  "haute",
  "hautes",
  "hutte",
  "huttes",
  "hurler",
  "hurle",
  "hurlent",
  "hamster",
  "hamsters",
  "hameau",
  "hache",
  "haches",
  "haricot",
  "haricots",
  "hêtre",
  "hêtres",
  "hasard",
  "hamac",
  "hamacs",
]);

/* ---------------------------- Lettres muettes ---------------------------- */

/**
 * Exact per-word masks for irregular sight words. Mask chars over the LAST
 * elision segment: `.` = pronounced, `x` = silent. Guarded lookups (see
 * `silent-letters.ts`).
 */
export const SIGHT_WORD_MASKS: ReadonlyMap<string, string> = new Map([
  ["est", ".xx"],
  ["et", ".x"],
  ["temps", "...xx"],
  ["longtemps", "...x...xx"],
  ["printemps", ".......xx"],
  ["corps", "...xx"],
  ["doigt", "...xx"],
  ["doigts", "...xxx"],
  ["gentil", ".....x"],
  ["gentils", ".....xx"],
  ["outil", "....x"],
  ["outils", "....xx"],
]);

/**
 * `-ent` words where the final t alone is silent ([ɑ̃] ending): common nouns
 * and adverbs. Any OTHER `-ent` word not preceded by ils/elles and not in
 * `ENT_PLURAL_VERBS` is left unmarked — graying only the t of a plural verb
 * (les amis jouen(t)) would teach the wrong [ɑ̃] reading.
 */
export const ENT_FINAL_T_ONLY: ReadonlySet<string> = new Set([
  "moment",
  "vent",
  "dent",
  "serpent",
  "argent",
  "parent",
  "présent",
  "content",
  "souvent",
  "comment",
  "doucement",
  "lentement",
  "vraiment",
  "calmement",
  "tranquillement",
  "gentiment",
  "simplement",
  "seulement",
  "tellement",
  "joliment",
  "heureusement",
  "finalement",
]);

/**
 * `-ent` forms that can ONLY be a 3rd-person-plural verb in French — the
 * form itself is unambiguous, so its `ent` is silent whatever the subject
 * (Adèle et Justine arriv(ent), les enfants mont(ent)). This closes the
 * recall gap of the ils/elles gate: story beats usually name the heroes
 * ("Adèle et Justine montent…"), so the literal-pronoun gate never fired.
 * CURATION RULE: a form goes in ONLY if it collides with no noun/adjective
 * ("content", "couvent", "parent", "pressent" stay out — the gate or the
 * noun lexicon handles them).
 */
export const ENT_PLURAL_VERBS: ReadonlySet<string> = new Set([
  "adorent",
  "admirent",
  "aident",
  "aiment",
  "allongent",
  "allument",
  "amusent",
  "appellent",
  "applaudissent",
  "apportent",
  "apprennent",
  "approchent",
  "arrêtent",
  "arrivent",
  "arrosent",
  "asseyent",
  "assoient",
  "atterrissent",
  "attendent",
  "attrapent",
  "avancent",
  "boivent",
  "bougent",
  "brillent",
  "cachent",
  "caressent",
  "chantent",
  "cherchent",
  "choisissent",
  "chuchotent",
  "commencent",
  "comprennent",
  "connaissent",
  "construisent",
  "continuent",
  "courent",
  "croquent",
  "cueillent",
  "dansent",
  "décident",
  "découvrent",
  "demandent",
  "descendent",
  "dessinent",
  "deviennent",
  "disent",
  "doivent",
  "donnent",
  "dorment",
  "échangent",
  "éclairent",
  "écoutent",
  "embrassent",
  "emmènent",
  "emportent",
  "endorment",
  "entendent",
  "entrent",
  "envolent",
  "escaladent",
  "espèrent",
  "essaient",
  "essayent",
  "éteignent",
  "étonnent",
  "explorent",
  "fabriquent",
  "ferment",
  "finissent",
  "flottent",
  "fredonnent",
  "gardent",
  "glissent",
  "goûtent",
  "grandissent",
  "grignotent",
  "grimpent",
  "habitent",
  "imaginent",
  "installent",
  "inventent",
  "invitent",
  "jouent",
  "lancent",
  "lèvent",
  "lisent",
  "longent",
  "mangent",
  "marchent",
  "mélangent",
  "mettent",
  "montent",
  "montrent",
  "murmurent",
  "nagent",
  "observent",
  "offrent",
  "oublient",
  "ouvrent",
  "partagent",
  "partent",
  "passent",
  "pêchent",
  "pensent",
  "peuvent",
  "picorent",
  "plongent",
  "portent",
  "posent",
  "poussent",
  "préfèrent",
  "prennent",
  "préparent",
  "promènent",
  "protègent",
  "racontent",
  "ramassent",
  "ramènent",
  "rangent",
  "regardent",
  "remarquent",
  "remercient",
  "remplissent",
  "rencontrent",
  "rentrent",
  "répondent",
  "reposent",
  "respirent",
  "ressemblent",
  "restent",
  "retournent",
  "retrouvent",
  "réveillent",
  "reviennent",
  "rêvent",
  "rient",
  "roulent",
  "saluent",
  "sautent",
  "savent",
  "sentent",
  "serrent",
  "sortent",
  "soufflent",
  "sourient",
  "suivent",
  "tiennent",
  "tirent",
  "tombent",
  "touchent",
  "tournent",
  "traversent",
  "trottent",
  "trouvent",
  "utilisent",
  "veulent",
  "viennent",
  "visitent",
  "voient",
  "volent",
  "voyagent",
]);

/**
 * Number words for the contextual `plus` rule: `deux plus deux` is the one
 * everyday context where `plus` before a consonant pronounces its s
 * (a hero may love numbers — arithmetic CAN show up in a beat).
 */
export const NUMBER_WORDS: ReadonlySet<string> = new Set([
  "un",
  "une",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "vingt",
  "cent",
  "mille",
]);

/** Monosyllables whose final e IS pronounced ([ə]) — never grayed. */
export const E_PRONOUNCED_MONOSYLLABLES: ReadonlySet<string> = new Set([
  "le",
  "de",
  "je",
  "ne",
  "que",
  "ce",
  "se",
  "me",
  "te",
]);

/** `-es` words where only the s is silent (le(s) = [le], not [lə]). */
export const ES_S_ONLY: ReadonlySet<string> = new Set([
  "les",
  "des",
  "mes",
  "tes",
  "ses",
  "ces",
  "es",
]);

/**
 * Final-s words where the s is pronounced — or ambiguous (tous, plus, os):
 * ambiguous words are never marked by the GENERIC final-s rule. `plus` still
 * gets a dedicated contextual rule (silent-letters.ts) for the one shape
 * where /ply/ is certain: directly before a consonant word.
 */
export const S_NEVER_MARK: ReadonlySet<string> = new Set([
  "fils",
  "ours",
  "bus",
  "as",
  "mars",
  "sens",
  "hélas",
  "cassis",
  "tennis",
  "maïs",
  "anis",
  "iris",
  "lys",
  "os",
  "tous",
  "plus",
]);

/** Final-t words where the t is pronounced (or commonly so — but/août). */
export const T_PRONOUNCED: ReadonlySet<string> = new Set([
  "sept",
  "huit",
  "net",
  "brut",
  "chut",
  "zut",
  "mat",
  "ouest",
  "août",
  "but",
]);

/** Final-d words where the d is pronounced. */
export const D_PRONOUNCED: ReadonlySet<string> = new Set(["sud"]);

/** Final-x words where the x is pronounced. */
export const X_PRONOUNCED: ReadonlySet<string> = new Set([
  "six",
  "dix",
  "index",
  "box",
  "lynx",
  "sphinx",
]);

/** Final-z words where the z is pronounced. */
export const Z_PRONOUNCED: ReadonlySet<string> = new Set(["gaz"]);

/**
 * Final-p ALLOWLIST (inverted default: loanwords like `stop`/`cap` pronounce
 * it, so p is only grayed for these known-silent words).
 */
export const P_SILENT: ReadonlySet<string> = new Set([
  "trop",
  "beaucoup",
  "loup",
  "coup",
  "sirop",
  "galop",
  "champ",
  "drap",
  "camp",
]);

/**
 * Silent final g: nasal vowel + g (lon(g), étan(g), poin(g)). `in` is NOT in
 * the alternation so English `-ing` loanwords (camping) stay untouched;
 * `oin` covers poing/coing.
 */
export const G_SILENT_PATTERN = /(?:an|en|on|un|oin|ain|ein)g$/;

// v2 candidates (deliberately deferred — open-class pronounced exceptions):
// final c (blanc/estomac vs sac/avec/parc), -er infinitives vs mer/hiver/
// super/hamster, interior silents (sculpter), h aspiré marking distinct
// from h muet.
