// Words that have no place in a calm, reassuring story for an anxious child.
// Scanned case-insensitively (spec §7: never scary/violent/sad). Shared by the
// classic and dynamic (choose-your-path) providers + the custom-prompt
// sanitizer so they all enforce the exact same safety net.
export const FORBIDDEN_TERMS = [
  "mort",
  "meurt",
  "mourir",
  "tuer",
  "tué",
  "sang",
  "monstre",
  "méchant",
  "horrible",
  "terrifiant",
  "effrayant",
  "peur",
  "danger",
  "guerre",
  "arme",
  "couteau",
  "pleure",
  "triste",
  "cauchemar",
  "fantôme",
  "sorcière",
  "ogre",
];
