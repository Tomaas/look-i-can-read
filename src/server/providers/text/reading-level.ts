/**
 * Single source of truth for the READING LEVEL of the generated text.
 *
 * The target reader is a beginning reader (fin CP / début CE1, ~6–7 ans): they can decode on
 * his own but tires quickly. The goal of this block is a story he reads ALONE,
 * without an adult, without fatigue or frustration — while keeping all the
 * warmth, charm and safety. The lever is the generation prompt only (no audio,
 * no syllable-coloring, no font change, no level UI).
 *
 * This is intentionally ONE exported constant injected into BOTH the classic
 * system prompt and the dynamic per-beat prompt, so the reading level lives in
 * a single tunable place. To make the stories easier/harder later, edit the
 * numbers HERE and nowhere else.
 *
 * The concrete targets (tuned for a fin-CP/début-CE1 reader):
 *  - short sentences (~8 mots, one idea each: sujet–verbe–complément),
 *  - everyday concrete vocabulary a 6-year-old already knows,
 *  - simple tenses (présent, passé composé courant) — no passé simple, no
 *    subjonctif, no plus-que-parfait, no imparfait lourd,
 *  - simple high-frequency CONNECTORS are ENCOURAGED (puis, ensuite, alors, et,
 *    mais, parce que, quand, comme, soudain, enfin) so the short sentences LINK
 *    into one continuous thread — chronology or cause→effect — instead of
 *    reading as a list of disconnected facts. The earlier "few connectors / one
 *    idea, isolated" rule made the text choppy (décousu); short sentences are
 *    kept, but they must flow. NO stacked/embedded subordinate clauses though
 *    (simple "quand/parce que" coordination is fine; never nest them),
 *  - a clear little NARRATIVE ARC with momentum (situation → petite envie /
 *    petit événement → résolution douce), not disconnected observations,
 *  - subject carried by pronouns (il/elle) across sentences so it reads as one
 *    thread, not a restart each line,
 *  - shorter overall (the sentence-count targets live in each prompt, near the
 *    structural rules, since classic vs dynamic differ),
 *  - short paragraphs (1–2 closely-linked sentences each) for visual aeration —
 *    the renderer already takes a paragraphs[] array, one entry per line.
 *
 * Two word-count knobs, exported so the prompt text and the retry nudge can
 * NEVER drift apart (one source of truth):
 *  - MAX_WORDS_TARGET: the ASPIRATIONAL ceiling the prompt asks the model to
 *    aim for (a sentence of this length is already fine).
 *  - MAX_WORDS_RETRY: the HARD nudge threshold — only a sentence STRICTLY longer
 *    than this triggers a readability corrective retry. It is deliberately
 *    looser than the target so the nudge fires only on genuinely long sentences
 *    and doesn't burn retries on borderline-fine output.
 */
export const MAX_WORDS_TARGET = 10;
export const MAX_WORDS_RETRY = 14;

export const READING_LEVEL_GUIDANCE = [
  "NIVEAU DE LECTURE (un enfant de 6–7 ans, fin CP / début CE1, qui lit SEUL",
  "mais se fatigue vite — il doit pouvoir déchiffrer presque tout sans adulte) :",
  `- Phrases courtes : vise 8 mots, ${MAX_WORDS_TARGET} grand maximum. Une seule`,
  "  idée par phrase (sujet – verbe – complément).",
  "- Vocabulaire simple et concret, des mots du quotidien qu'un enfant de 6 ans",
  "  connaît déjà. Évite les mots rares, longs ou abstraits.",
  "- Temps simples : présent (et passé composé courant). PAS de passé simple, PAS",
  "  de subjonctif, PAS de plus-que-parfait, évite l'imparfait compliqué.",
  "- TRÈS IMPORTANT — ça doit COULER comme une vraie histoire, pas une liste de",
  "  phrases détachées. Relie les phrases courtes avec des petits mots simples",
  "  que l'enfant lit facilement : puis, ensuite, alors, et, mais, parce que,",
  "  quand, comme, soudain, enfin. Chaque phrase découle de la précédente",
  "  (l'ordre des choses, ou la cause et l'effet). Reprends le héros par « il »",
  "  ou « elle » pour garder un seul fil continu.",
  "- MAIS garde les phrases simples : pas de subordonnées empilées ni de",
  "  propositions enchâssées (un seul « quand »/« parce que » à la fois, jamais",
  "  imbriqués).",
  "- Une petite HISTOIRE avec un fil : un début, une petite envie ou un petit",
  "  événement, puis une fin douce. On a envie de savoir la suite. Pas une suite",
  "  d'observations sans lien.",
  "- Dans le tableau paragraphs : souvent 1 phrase par entrée, parfois 2 quand",
  "  elles vont vraiment ensemble. Garde une belle aération (pas tout dans une",
  "  seule entrée, pas une liste à puces non plus).",
].join("\n");
